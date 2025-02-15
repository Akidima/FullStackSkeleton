import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMeetingSchema, updateMeetingSchema } from "@shared/schema";
import { ZodError } from "zod";
import passport from "./auth";
import { semanticSearch } from "./services/search";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface User {
      id: number;
      googleId: string;
      email: string;
      displayName: string;
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
    })
  );

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/login",
      successRedirect: "/",
    })
  );

  app.get("/auth/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  app.get("/api/me", (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
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

    const success = await storage.deleteMeeting(Number(req.params.id));
    res.status(204).send();
  });

  app.post("/api/meetings/search", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }

      // Get user's meetings first
      const meetings = await storage.getUserMeetings(req.user!.id);

      // Perform semantic search on the meetings
      const searchResults = await semanticSearch(query, meetings);

      res.json(searchResults);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  return createServer(app);
}