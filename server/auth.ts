import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { google } from 'googleapis';
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import express, { Express, Request, Response } from "express";
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

export function registerAuthEndpoints(app: Express) {
  // Get the Replit domain
  const appDomain = process.env.REPL_SLUG && process.env.REPL_OWNER
    ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
    : 'localhost:3000';
  const appUrl = `https://${appDomain}`;

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('Missing Google OAuth credentials. Authentication will not work properly.');
    return;
  }

  // Configure Google OAuth Strategy with proper scopes
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${appUrl}/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await storage.getUserByGoogleId(profile.id);

          if (!user) {
            // Check if email is already registered
            const existingUser = await storage.getUserByEmail(profile.emails?.[0]?.value ?? "");
            if (existingUser) {
              return done(null, false, { message: "Email already registered with different method" });
            }

            // Create new user
            user = await storage.createUser({
              googleId: profile.id,
              email: profile.emails?.[0]?.value ?? "",
              displayName: profile.displayName,
              accessToken,
              refreshToken,
              isVerified: true,
              password: null,
            });
          } else {
            // Update existing user's tokens
            await storage.updateUser(user.id, {
              accessToken,
              refreshToken,
            });
          }

          return done(null, user);
        } catch (err) {
          console.error('Google authentication error:', err);
          return done(err as Error);
        }
      }
    )
  );

  // Google OAuth routes with improved error handling
  app.get("/auth/google",
    (req, res, next) => {
      passport.authenticate("google", {
        scope: [
          "profile",
          "email",
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events"
        ],
        accessType: 'offline',
        prompt: 'consent',
        session: false
      })(req, res, next);
    }
  );

  app.get("/auth/google/callback",
    (req, res, next) => {
      passport.authenticate("google", { session: false }, (err, user, info) => {
        if (err) {
          console.error('Google callback error:', err);
          return res.redirect('/login?error=google-auth-error');
        }

        if (!user) {
          return res.redirect(`/login?error=${encodeURIComponent(info?.message || 'google-auth-failed')}`);
        }

        try {
          const token = generateToken(user);
          res.redirect(`/?token=${token}`);
        } catch (error) {
          console.error('Token generation error:', error);
          res.redirect('/login?error=token-generation-failed');
        }
      })(req, res, next);
    }
  );

  // Calendar events endpoint
  app.get("/api/calendar/events", authenticateJWT, asyncHandler(async (req, res) => {
    const user = await storage.getUserById(req.user!.id);

    if (!user?.accessToken) {
      throw new AuthenticationError("Google Calendar access not authorized");
    }

    const calendar = google.calendar({ version: 'v3', auth: new google.auth.OAuth2() });
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    auth.setCredentials({ access_token: user.accessToken });
    calendar.context._options.auth = auth;

    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      });

      res.json({
        status: 'success',
        data: {
          events: response.data.items
        }
      });
    } catch (error: any) {
      if (error.code === 401) {
        // Token expired, need to re-authenticate
        throw new AuthenticationError("Calendar access token expired. Please re-authenticate.");
      }
      throw error;
    }
  }));

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

  // Forgot password route - Moved inside registerAuthEndpoints
  app.post("/api/forgot-password", authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError("Email is required");
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return res.json({
        status: 'success',
        message: 'If an account exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const hashedToken = await hashPassword(resetToken);

    // Save reset token and expiry
    await storage.updateUser(user.id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 3600000) // 1 hour
    });

    // TODO: Send reset email with token
    // For now, just return the token
    res.json({
      status: 'success',
      message: 'Password reset instructions sent',
      // Remove this in production:
      debug: { resetToken }
    });
  }));

  // Reset password route - Moved inside registerAuthEndpoints
  app.post("/api/reset-password", authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new ValidationError("Token and new password are required");
    }

    const user = await storage.getUserByResetToken(token);
    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new ValidationError("Invalid or expired reset token");
    }

    const hashedPassword = await hashPassword(password);
    await storage.updateUser(user.id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null
    });

    res.json({
      status: 'success',
      message: 'Password has been reset'
    });
  }));
}

export default passport;