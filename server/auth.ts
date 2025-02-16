import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import express, { Express } from "express";
import jwt from "jsonwebtoken";
import { rateLimit } from 'express-rate-limit';
import { errorHandler, asyncHandler } from "./middleware/errorHandler";
import { AuthenticationError, ValidationError, ConflictError } from "./errors/AppError";

const scryptAsync = promisify(scrypt);

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
    { id: user.id, email: user.email, displayName: user.displayName },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
}

export function authenticateJWT(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ 
      status: 'error',
      message: "No token provided" 
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as Express.User;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        status: 'error',
        message: "Token expired" 
      });
    }
    return res.status(401).json({ 
      status: 'error',
      message: "Invalid token" 
    });
  }
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { 
    status: 'error',
    message: 'Too many requests, please try again in 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure passport strategies
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return done(null, false, { message: "Invalid email or password" });
      }

      if (!user.password) {
        return done(null, false, { message: "Account exists but requires different login method" });
      }

      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        return done(null, false, { message: "Invalid email or password" });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Update passport serialization
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

export function registerAuthEndpoints(app: Express) {
  app.post("/api/signup", authLimiter, asyncHandler(async (req, res) => {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      throw new ValidationError("Email, password, and display name are required");
    }

    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    const hashedPassword = await hashPassword(password);
    const user = await storage.createUser({
      email,
      password: hashedPassword,
      displayName,
      googleId: null,
      isVerified: true,
    });

    const token = generateToken(user);
    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isAdmin: user.isAdmin
        },
        token
      }
    });
  }));

  app.post("/api/login", authLimiter, (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: User | false, info: { message: string } | undefined) => {
      if (err) {
        return next(new AuthenticationError("Authentication error"));
      }
      if (!user) {
        return next(new AuthenticationError(info?.message || "Authentication failed"));
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          return next(new AuthenticationError("Login error"));
        }

        const token = generateToken(user);
        res.json({
          status: 'success',
          data: {
            user: {
              id: user.id,
              email: user.email,
              displayName: user.displayName,
              isAdmin: user.isAdmin
            },
            token
          }
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ 
          status: 'error',
          message: 'Logout failed' 
        });
      }
      res.json({ 
        status: 'success',
        message: 'Logged out successfully' 
      });
    });
  });

  // Protected route to get current user
  app.get("/api/me", authenticateJWT, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user) {
        return res.status(401).json({ 
          status: 'error',
          message: "User not found" 
        });
      }
      res.json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            isAdmin: user.isAdmin
          }
        }
      });
    } catch (err) {
      res.status(500).json({ 
        status: 'error',
        message: "Internal server error" 
      });
    }
  });

  // Google OAuth routes
  const appDomain = `${process.env.REPL_SLUG?.toLowerCase()}.${process.env.REPL_OWNER?.toLowerCase()}.repl.co`;
  const appUrl = `https://${appDomain}`;

  app.get("/auth/google", (req, res, next) => {
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account",
      session: false
    })(req, res, next);
  });

  app.get("/auth/google/callback", (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
      if (err || !user) {
        return res.redirect('/login?error=google-auth-failed');
      }

      const token = generateToken(user);
      res.redirect(`/?token=${token}`);
    })(req, res, next);
  });
}

if (!process.env.JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable");
}

export default passport;