import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMeetingSchema, updateMeetingSchema, loginUserSchema, insertSecurityRecommendationSchema, updateSecurityRecommendationSchema } from "@shared/schema";
import { ZodError } from "zod";
import passport from "./auth";
import { semanticSearch } from "./services/search";
import { generateMeetingInsights, batchSummarize } from "./services/summarize";
import { sendPasswordResetEmail, sendVerificationEmail } from "./services/email";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { requireRecaptcha } from "./middleware/recaptcha";
import { registerAuthEndpoints } from "./auth";
import { errorHandler, asyncHandler } from "./middleware/errorHandler";
import { AuthenticationError, NotFoundError, ValidationError, ConflictError } from "./errors/AppError";

// Authentication middleware using new error classes
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  throw new AuthenticationError();
};

const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    throw new AuthenticationError("Access denied. Admin privileges required.");
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Register auth endpoints first
  registerAuthEndpoints(app);

  // Protected routes using asyncHandler
  app.get("/api/me", asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AuthenticationError();
    }
    res.json(req.user);
  }));

  // Password reset and email verification routes
  app.post("/api/forgot-password", requireRecaptcha, asyncHandler(async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        throw new ValidationError("Email is required");
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Return success even if user doesn't exist to prevent email enumeration
        return res.json({ message: "If an account exists with this email, you will receive password reset instructions." });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      try {
        await storage.updateUser(user.id, {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        });

        await sendPasswordResetEmail(email, resetToken);

        res.json({ message: "If an account exists with this email, you will receive password reset instructions." });
      } catch (error) {
        // Revert the token if email sending fails
        await storage.updateUser(user.id, {
          passwordResetToken: null,
          passwordResetExpires: null,
        });

        throw new Error("Failed to send password reset email. Please try again later.");
      }
    } catch (error) {
      throw error;
    }
  }));

  app.post("/api/reset-password", requireRecaptcha, asyncHandler(async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        throw new ValidationError("Token and password are required");
      }

      const user = await storage.getUserByResetToken(token);
      if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        throw new ValidationError("Invalid or expired reset token");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      res.json({ message: "Password reset successful" });
    } catch (error) {
      throw error;
    }
  }));

  app.post("/api/verify-email", asyncHandler(async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        throw new ValidationError("Verification token is required");
      }

      const user = await storage.getUserByVerificationToken(token);
      if (!user || !user.verificationExpires || user.verificationExpires < new Date()) {
        throw new ValidationError("Invalid or expired verification token");
      }

      await storage.updateUser(user.id, {
        isVerified: true,
        verificationToken: null,
        verificationExpires: null,
      });

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      throw error;
    }
  }));


  // Example of using asyncHandler with error handling
  app.post("/api/meetings", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const meetingData = insertMeetingSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      const meeting = await storage.createMeeting(meetingData);
      res.status(201).json(meeting);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Invalid meeting data", error.errors);
      }
      throw error;
    }
  }));

  app.get("/api/meetings/:id", isAuthenticated, asyncHandler(async (req, res) => {
    const meeting = await storage.getMeeting(Number(req.params.id));
    if (!meeting || meeting.userId !== req.user!.id) {
      throw new NotFoundError("Meeting");
    }
    res.json(meeting);
  }));

  app.patch("/api/meetings/:id", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const meeting = await storage.getMeeting(Number(req.params.id));
      if (!meeting || meeting.userId !== req.user!.id) {
        throw new NotFoundError("Meeting");
      }

      const meetingData = updateMeetingSchema.parse(req.body);
      const updatedMeeting = await storage.updateMeeting(
        Number(req.params.id),
        meetingData
      );
      res.json(updatedMeeting);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Invalid meeting data", error.errors);
      }
      throw error;
    }
  }));

  app.delete("/api/meetings/:id", isAuthenticated, asyncHandler(async (req, res) => {
    const meeting = await storage.getMeeting(Number(req.params.id));
    if (!meeting || meeting.userId !== req.user!.id) {
      throw new NotFoundError("Meeting");
    }

    await storage.deleteMeeting(Number(req.params.id));
    res.status(204).send();
  }));

  // Search and summarization routes
  app.post("/api/meetings/search", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        throw new ValidationError("Search query is required");
      }
      const meetings = await storage.getUserMeetings(req.user!.id);
      const searchResults = await semanticSearch(query, meetings);
      res.json(searchResults);
    } catch (error) {
      throw error;
    }
  }));

  app.post("/api/meetings/:id/summarize", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const meeting = await storage.getMeeting(Number(req.params.id));
      if (!meeting || meeting.userId !== req.user!.id) {
        throw new NotFoundError("Meeting");
      }

      const summary = await generateMeetingInsights(meeting);
      const updatedMeeting = await storage.updateMeeting(meeting.id, { summary });
      res.json({ summary });
    } catch (error) {
      throw error;
    }
  }));

  app.post("/api/meetings/summarize-batch", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const meetings = await storage.getUserMeetings(req.user!.id);
      const summaries = await batchSummarize(meetings);
      for (const [meetingId, summary] of Object.entries(summaries)) {
        await storage.updateMeeting(Number(meetingId), { summary });
      }
      res.json({ summaries });
    } catch (error) {
      throw error;
    }
  }));

  // Security recommendation routes
  app.get("/api/security-recommendations", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const recommendations = await storage.getUserSecurityRecommendations(req.user!.id);
      res.json(recommendations);
    } catch (error) {
      throw error;
    }
  }));

  app.post("/api/security-recommendations", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const recommendationData = insertSecurityRecommendationSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      const recommendation = await storage.createSecurityRecommendation(recommendationData);
      res.status(201).json(recommendation);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Invalid security recommendation data", error.errors);
      }
      throw error;
    }
  }));

  app.patch("/api/security-recommendations/:id", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const recommendationData = updateSecurityRecommendationSchema.parse(req.body);
      const recommendation = await storage.updateSecurityRecommendation(
        Number(req.params.id),
        recommendationData
      );
      res.json(recommendation);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Invalid security recommendation data", error.errors);
      }
      throw error;
    }
  }));

  app.post("/api/security-recommendations/:id/dismiss", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const recommendation = await storage.dismissSecurityRecommendation(Number(req.params.id));
      res.json(recommendation);
    } catch (error) {
      throw error;
    }
  }));

  app.post("/api/security-recommendations/:id/implement", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const recommendation = await storage.implementSecurityRecommendation(Number(req.params.id));
      res.json(recommendation);
    } catch (error) {
      throw error;
    }
  }));

  // Admin-only routes
  app.get("/api/admin/registration-attempts", isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
    try {
      const attempts = await storage.getRegistrationAttempts(100);
      res.json(attempts);
    } catch (error) {
      throw error;
    }
  }));

  app.get("/api/admin/registration-attempts/ip/:ip", isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
    try {
      const attempts = await storage.getRegistrationAttemptsByIP(req.params.ip);
      res.json(attempts);
    } catch (error) {
      throw error;
    }
  }));

  app.get("/api/admin/registration-attempts/email/:email", isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
    try {
      const attempts = await storage.getRegistrationAttemptsByEmail(req.params.email);
      res.json(attempts);
    } catch (error) {
      throw error;
    }
  }));

  // Protected meeting routes
  app.get("/api/meetings", isAuthenticated, asyncHandler(async (req, res) => {
    const meetings = await storage.getUserMeetings(req.user!.id);
    res.json(meetings);
  }));


  // Register error handler last
  app.use(errorHandler);

  return createServer(app);
}