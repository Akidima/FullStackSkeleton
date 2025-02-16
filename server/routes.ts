import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMeetingSchema, updateMeetingSchema } from "@shared/schema";
import { ZodError } from "zod";
import passport from "./auth";
import { errorHandler, asyncHandler } from "./middleware/errorHandler";
import { AuthenticationError, NotFoundError, ValidationError } from "./errors/AppError";

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  throw new AuthenticationError();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Protected route to get current user
  app.get("/api/me", asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AuthenticationError();
    }
    res.json({
      status: 'success',
      user: req.user
    });
  }));

  // Meeting Management Routes
  app.get("/api/meetings", isAuthenticated, asyncHandler(async (req, res) => {
    const meetings = await storage.getUserMeetings(req.user!.id);
    res.json({
      status: 'success',
      meetings
    });
  }));

  app.post("/api/meetings", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const meetingData = insertMeetingSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      const meeting = await storage.createMeeting(meetingData);
      res.status(201).json({
        status: 'success',
        meeting
      });
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
    res.json({
      status: 'success',
      meeting
    });
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
      res.json({
        status: 'success',
        meeting: updatedMeeting
      });
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

  // Register error handler last
  app.use(errorHandler);

  return createServer(app);
}

import { registerAuthEndpoints } from "./auth";