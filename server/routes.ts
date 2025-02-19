import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMeetingSchema, updateMeetingSchema } from "@shared/schema";
import { ZodError } from "zod";
import { errorHandler, asyncHandler } from "./middleware/errorHandler";
import { NotFoundError, ValidationError } from "./errors/AppError";

export async function registerRoutes(app: Express): Promise<Server> {
  // Meeting Management Routes
  app.get("/api/meetings", asyncHandler(async (req, res) => {
    const meetings = await storage.getMeetings();
    res.json({
      status: 'success',
      meetings
    });
  }));

  app.post("/api/meetings", asyncHandler(async (req, res) => {
    try {
      const meetingData = insertMeetingSchema.parse(req.body);
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

  app.get("/api/meetings/:id", asyncHandler(async (req, res) => {
    const meeting = await storage.getMeeting(Number(req.params.id));
    if (!meeting) {
      throw new NotFoundError("Meeting");
    }
    res.json({
      status: 'success',
      meeting
    });
  }));

  app.patch("/api/meetings/:id", asyncHandler(async (req, res) => {
    try {
      const meeting = await storage.getMeeting(Number(req.params.id));
      if (!meeting) {
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

  app.delete("/api/meetings/:id", asyncHandler(async (req, res) => {
    const meeting = await storage.getMeeting(Number(req.params.id));
    if (!meeting) {
      throw new NotFoundError("Meeting");
    }

    await storage.deleteMeeting(Number(req.params.id));
    res.status(204).send();
  }));

  // Register error handler last
  app.use(errorHandler);

  return createServer(app);
}