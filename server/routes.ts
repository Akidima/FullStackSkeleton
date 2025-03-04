import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMeetingSchema, updateMeetingSchema } from "@shared/schema";
import { ZodError } from "zod";
import { errorHandler, asyncHandler } from "./middleware/errorHandler";
import { NotFoundError, ValidationError } from "./errors/AppError";
import { AgendaService } from "./services/agenda";
import { generateMeetingInsights, batchSummarize } from "./services/summarize";

export async function registerRoutes(app: Express): Promise<Server> {
  // Meeting Management Routes
  app.get("/api/meetings", asyncHandler(async (req: Request, res: Response) => {
    const meetings = await storage.getMeetings();
    res.json(meetings);
  }));

  app.post("/api/meetings", asyncHandler(async (req: Request, res: Response) => {
    try {
      const meetingData = insertMeetingSchema.parse(req.body);
      const meeting = await storage.createMeeting(meetingData);
      res.status(201).json(meeting);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Invalid meeting data", error.errors);
      }
      throw error;
    }
  }));

  // Generate meeting summary endpoint
  app.post("/api/meetings/:id/summarize", asyncHandler(async (req: Request, res: Response) => {
    try {
      const meeting = await storage.getMeeting(Number(req.params.id));
      if (!meeting) {
        throw new NotFoundError("Meeting");
      }

      const summary = await generateMeetingInsights(meeting);

      // Update the meeting with the new summary
      const updatedMeeting = await storage.updateMeeting(meeting.id, {
        summary: summary.summary
      });

      res.json({
        meeting: updatedMeeting,
        summaryDetails: summary
      });
    } catch (error) {
      console.error("Error generating meeting summary:", error);
      throw error;
    }
  }));

  // Generate agenda endpoint
  app.post("/api/meetings/generate-agenda", asyncHandler(async (req: Request, res: Response) => {
    try {
      const { title, userId, duration = 60 } = req.body;

      if (!title || !userId) {
        throw new ValidationError("Missing required fields", [
          { field: "title", message: "Meeting title is required" },
          { field: "userId", message: "User ID is required" }
        ]);
      }

      const pastMeetings = await storage.getUserMeetings(userId);
      const upcomingTasks = [];

      const agendaSuggestion = await AgendaService.generateAgenda(
        title,
        pastMeetings,
        upcomingTasks,
        duration
      );

      res.json(agendaSuggestion);
    } catch (error) {
      console.error("Error generating agenda:", error);
      throw error;
    }
  }));

  app.get("/api/meetings/:id", asyncHandler(async (req: Request, res: Response) => {
    const meeting = await storage.getMeeting(Number(req.params.id));
    if (!meeting) {
      throw new NotFoundError("Meeting");
    }
    res.json(meeting);
  }));

  app.patch("/api/meetings/:id", asyncHandler(async (req: Request, res: Response) => {
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
      res.json(updatedMeeting);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Invalid meeting data", error.errors);
      }
      throw error;
    }
  }));

  app.delete("/api/meetings/:id", asyncHandler(async (req: Request, res: Response) => {
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