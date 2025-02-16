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

// Extend Express Request type with proper User type
declare global {
  namespace Express {
    interface User extends User {}
  }
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

function generateToken(user: User) {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as User;
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

// Local Strategy for email/password auth
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email: string, password: string, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user || !user.password) {
          return done(null, false, { message: "Invalid email or password" });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid email or password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/auth/google/callback`,
    },
    async (accessToken: string, refreshToken: string, profile: any, done) => {
      try {
        let user = await storage.getUserByGoogleId(profile.id);

        if (!user) {
          // Check if email is already registered
          const existingUser = await storage.getUserByEmail(
            profile.emails?.[0]?.value ?? ""
          );
          if (existingUser) {
            return done(null, false, { message: "Email already registered with different method" });
          }

          user = await storage.createUser({
            googleId: profile.id,
            email: profile.emails?.[0]?.value ?? "",
            displayName: profile.displayName,
            profilePicture: profile.photos?.[0]?.value ?? null,
            password: null,
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

export function registerAuthEndpoints(app: express.Application) {
  app.post("/api/signup", async (req, res, next) => {
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
        user,
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

  app.post("/api/login", (req, res, next) => {
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