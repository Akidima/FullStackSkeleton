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

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface User {
      id: number;
      googleId: string;
      email: string;
      displayName: string;
      isAdmin?: boolean;
    }
  }
}

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Add this function after the isAuthenticated middleware
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Access denied. Admin privileges required." });
  }
  next();
};

// Add this error handling utility
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Register auth endpoints first
  registerAuthEndpoints(app);

  // Protected routes follow...
  app.get("/api/me", (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Password reset and email verification routes
  app.post("/api/forgot-password", requireRecaptcha, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
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
        console.error("Detailed error:", getErrorMessage(error));

        // Revert the token if email sending fails
        await storage.updateUser(user.id, {
          passwordResetToken: null,
          passwordResetExpires: null,
        });

        throw new Error("Failed to send password reset email. Please try again later.");
      }
    } catch (error) {
      console.error("Password reset error:", getErrorMessage(error));
      res.status(500).json({ message: getErrorMessage(error) || "Failed to process password reset request" });
    }
  });

  app.post("/api/reset-password", requireRecaptcha, async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      const user = await storage.getUserByResetToken(token);
      if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.post("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
      }

      const user = await storage.getUserByVerificationToken(token);
      if (!user || !user.verificationExpires || user.verificationExpires < new Date()) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      await storage.updateUser(user.id, {
        isVerified: true,
        verificationToken: null,
        verificationExpires: null,
      });

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Admin-only routes
  app.get("/api/admin/registration-attempts", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const attempts = await storage.getRegistrationAttempts(100);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching registration attempts:", error);
      res.status(500).json({ message: "Failed to fetch registration attempts" });
    }
  });

  app.get("/api/admin/registration-attempts/ip/:ip", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const attempts = await storage.getRegistrationAttemptsByIP(req.params.ip);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching registration attempts by IP:", error);
      res.status(500).json({ message: "Failed to fetch registration attempts" });
    }
  });

  app.get("/api/admin/registration-attempts/email/:email", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const attempts = await storage.getRegistrationAttemptsByEmail(req.params.email);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching registration attempts by email:", error);
      res.status(500).json({ message: "Failed to fetch registration attempts" });
    }
  });

  // Protected meeting routes
  app.get("/api/meetings", isAuthenticated, async (req, res) => {
    const meetings = await storage.getUserMeetings(req.user!.id);
    res.json(meetings);
  });

  app.get("/api/meetings/:id", isAuthenticated, async (req, res) => {
    const meeting = await storage.getMeeting(Number(req.params.id));
    if (!meeting || meeting.userId !== req.user!.id) {
      return res.status(404).json({ message: "Meeting not found" });
    }
    res.json(meeting);
  });

  app.post("/api/meetings", isAuthenticated, async (req, res) => {
    try {
      const meetingData = insertMeetingSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      const meeting = await storage.createMeeting(meetingData);
      res.status(201).json(meeting);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/meetings/:id", isAuthenticated, async (req, res) => {
    try {
      const meeting = await storage.getMeeting(Number(req.params.id));
      if (!meeting || meeting.userId !== req.user!.id) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      const meetingData = updateMeetingSchema.parse(req.body);
      const updatedMeeting = await storage.updateMeeting(
        Number(req.params.id),
        meetingData
      );
      res.json(updatedMeeting);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/meetings/:id", isAuthenticated, async (req, res) => {
    const meeting = await storage.getMeeting(Number(req.params.id));
    if (!meeting || meeting.userId !== req.user!.id) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    await storage.deleteMeeting(Number(req.params.id));
    res.status(204).send();
  });

  // Search and summarization routes
  app.post("/api/meetings/search", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }
      const meetings = await storage.getUserMeetings(req.user!.id);
      const searchResults = await semanticSearch(query, meetings);
      res.json(searchResults);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  app.post("/api/meetings/:id/summarize", isAuthenticated, async (req, res) => {
    try {
      const meeting = await storage.getMeeting(Number(req.params.id));
      if (!meeting || meeting.userId !== req.user!.id) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      const summary = await generateMeetingInsights(meeting);
      const updatedMeeting = await storage.updateMeeting(meeting.id, { summary });
      res.json({ summary });
    } catch (error) {
      console.error("Summarization error:", error);
      res.status(500).json({ message: "Failed to generate meeting summary" });
    }
  });

  app.post("/api/meetings/summarize-batch", isAuthenticated, async (req, res) => {
    try {
      const meetings = await storage.getUserMeetings(req.user!.id);
      const summaries = await batchSummarize(meetings);
      for (const [meetingId, summary] of Object.entries(summaries)) {
        await storage.updateMeeting(Number(meetingId), { summary });
      }
      res.json({ summaries });
    } catch (error) {
      console.error("Batch summarization error:", error);
      res.status(500).json({ message: "Failed to generate meeting summaries" });
    }
  });

  // Security recommendation routes
  app.get("/api/security-recommendations", isAuthenticated, async (req, res) => {
    try {
      const recommendations = await storage.getUserSecurityRecommendations(req.user!.id);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching security recommendations:", getErrorMessage(error));
      res.status(500).json({ message: "Failed to fetch security recommendations" });
    }
  });

  app.post("/api/security-recommendations", isAuthenticated, async (req, res) => {
    try {
      const recommendationData = insertSecurityRecommendationSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      const recommendation = await storage.createSecurityRecommendation(recommendationData);
      res.status(201).json(recommendation);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Error creating security recommendation:", getErrorMessage(error));
      res.status(500).json({ message: "Failed to create security recommendation" });
    }
  });

  app.patch("/api/security-recommendations/:id", isAuthenticated, async (req, res) => {
    try {
      const recommendationData = updateSecurityRecommendationSchema.parse(req.body);
      const recommendation = await storage.updateSecurityRecommendation(
        Number(req.params.id),
        recommendationData
      );
      res.json(recommendation);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Error updating security recommendation:", getErrorMessage(error));
      res.status(500).json({ message: "Failed to update security recommendation" });
    }
  });

  app.post("/api/security-recommendations/:id/dismiss", isAuthenticated, async (req, res) => {
    try {
      const recommendation = await storage.dismissSecurityRecommendation(Number(req.params.id));
      res.json(recommendation);
    } catch (error) {
      console.error("Error dismissing security recommendation:", getErrorMessage(error));
      res.status(500).json({ message: "Failed to dismiss security recommendation" });
    }
  });

  app.post("/api/security-recommendations/:id/implement", isAuthenticated, async (req, res) => {
    try {
      const recommendation = await storage.implementSecurityRecommendation(Number(req.params.id));
      res.json(recommendation);
    } catch (error) {
      console.error("Error implementing security recommendation:", getErrorMessage(error));
      res.status(500).json({ message: "Failed to implement security recommendation" });
    }
  });

  return createServer(app);
}