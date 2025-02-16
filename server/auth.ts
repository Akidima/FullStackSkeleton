import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import express from "express";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { rateLimit } from 'express-rate-limit';

// Fix the recursive type reference issue
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      displayName: string;
      isAdmin?: boolean;
      googleId?: string | null;
      verificationToken?: string | null;
      verificationExpires?: Date | null;
      isVerified?: boolean;
      profilePicture?: string | null;
      password?: string | null;
    }
  }
}

const scryptAsync = promisify(scrypt);

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Generate verification token
function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

// Send verification email
async function sendVerificationEmail(email: string, token: string) {
  const appUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  const verificationUrl = `${appUrl}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Verify your email address",
    html: `
      <h1>Welcome to Meeting Assistant!</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `,
  });
}

if (!process.env.JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable");
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function generateToken(user: Express.User) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}

// JWT verification middleware
export function authenticateJWT(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as Express.User;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
}

// Set up passport serialization
passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUserById(id);
    if (!user) {
      return done(new Error('User not found'));
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Processing Google auth for profile:", profile.id);

        let user = await storage.getUserByGoogleId(profile.id);

        if (!user) {
          // Check if email is already registered
          const existingUser = await storage.getUserByEmail(
            profile.emails?.[0]?.value ?? ""
          );

          if (existingUser) {
            console.error("Email already registered:", profile.emails?.[0]?.value);
            return done(null, false, { message: "Email already registered with different method" });
          }

          console.log("Creating new user for Google profile:", profile.id);
          user = await storage.createUser({
            googleId: profile.id,
            email: profile.emails?.[0]?.value ?? "",
            displayName: profile.displayName,
            profilePicture: profile.photos?.[0]?.value ?? null,
            password: null,
            isVerified: true, // Google OAuth users are automatically verified
          });
        }

        return done(null, {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          googleId: user.googleId,
          isAdmin: user.isAdmin
        });
      } catch (err) {
        console.error("Google strategy error:", err);
        return done(err as Error);
      }
    }
  )
);

export function registerAuthEndpoints(app: express.Application) {
  // Adjust rate limiting to be more lenient
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Increased from 5 to 20 attempts
    message: 'Too many requests, please try again in 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Google OAuth routes with improved error handling
  app.get(
    "/auth/google",
    (req, res, next) => {
      try {
        passport.authenticate("google", {
          scope: ["profile", "email"],
          prompt: "select_account", // Always show account selector
        })(req, res, next);
      } catch (error) {
        console.error("Google auth error:", error);
        res.redirect('/login?error=google-auth-failed');
      }
    }
  );

  app.get(
    "/auth/google/callback",
    (req, res, next) => {
      passport.authenticate("google", { session: false }, (err, user, info) => {
        if (err) {
          console.error("Google callback error:", err);
          return res.redirect('/login?error=google-auth-failed');
        }

        if (!user) {
          console.error("No user returned from Google auth:", info);
          return res.redirect('/login?error=no-user-found');
        }

        try {
          const token = jwt.sign(
            { 
              id: user.id,
              email: user.email,
              displayName: user.displayName 
            },
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
          );

          // Redirect to frontend with token
          res.redirect(`/?token=${token}`);
        } catch (error) {
          console.error("Token generation error:", error);
          res.redirect('/login?error=auth-failed');
        }
      })(req, res, next);
    }
  );

  app.post("/api/signup", authLimiter, async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const verificationToken = generateVerificationToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        googleId: null,
        verificationToken,
        verificationExpires,
        isVerified: false,
      });

      // Send verification email
      await sendVerificationEmail(user.email, verificationToken);

      const token = generateToken(user);
      res.status(201).json({ 
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isAdmin: user.isAdmin
        },
        token,
        message: "Please check your email to verify your account" 
      });
    } catch (error) {
      next(error);
    }
  });


  app.post("/api/verify-email", async (req, res) => {
    const { token } = req.body;

    try {
      const user = await storage.getUserByVerificationToken(token);

      if (!user) {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      if (user.verificationExpires && new Date() > new Date(user.verificationExpires)) {
        return res.status(400).json({ message: "Verification token has expired" });
      }

      await storage.updateUser(user.id, {
        isVerified: true,
        verificationToken: null,
        verificationExpires: null,
      });

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error verifying email" });
    }
  });

  app.post("/api/resend-verification", authenticateJWT, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }

      const verificationToken = generateVerificationToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await storage.updateUser(user.id, {
        verificationToken,
        verificationExpires,
      });

      await sendVerificationEmail(user.email, verificationToken);

      res.json({ message: "Verification email sent" });
    } catch (error) {
      res.status(500).json({ message: "Error sending verification email" });
    }
  });

  app.post("/api/login", authLimiter, (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: User | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const token = generateToken(user);
        res.json({ user, token });
      });
    })(req, res, next);
  });

  app.get("/api/me", authenticateJWT, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Example of another protected route
  app.get("/api/protected", authenticateJWT, (req, res) => {
    res.json({ message: "This is a protected route", user: req.user });
  });
}

export default passport;