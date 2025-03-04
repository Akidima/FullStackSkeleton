import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMeetingSchema, updateMeetingSchema } from "@shared/schema";
import { ZodError } from "zod";
import { errorHandler, asyncHandler } from "./middleware/errorHandler";
import { NotFoundError, ValidationError } from "./errors/AppError";
import { AgendaService } from "./services/agenda";
import { getAIInsights } from "./services/ai-insights";
import { generateMeetingInsights, batchSummarize } from "./services/summarize";
import { SchedulerService } from "./services/scheduler";
import { broadcastMeetingUpdate } from "./websocket";
import { authenticateJWT } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Meeting Management Routes
  app.get("/api/meetings", asyncHandler(async (req: Request, res: Response) => {
    const meetings = await storage.getMeetings();
    res.json(meetings);
  }));

  // Add AI Insights Routes
  app.get("/api/meetings/:id/insights", asyncHandler(async (req: Request, res: Response) => {
    const meeting = await storage.getMeeting(Number(req.params.id));
    if (!meeting) {
      throw new NotFoundError("Meeting");
    }

    const insights = await storage.getMeetingInsights(meeting.id);

    // If no insights exist yet, generate them
    if (insights.length === 0) {
      const aiService = await getAIInsights();
      const previousOutcomes = await storage.getMeetingOutcomes(meeting.id);
      const generatedInsights = await aiService.generateMeetingInsights(
        meeting.title,
        meeting.description || '',
        previousOutcomes.map(o => o.outcome)
      );

      // Store and return the generated insights
      const storedInsights = await Promise.all(
        generatedInsights.map(insight => 
          storage.createMeetingInsight({
            meetingId: meeting.id,
            insight: insight.insight,
            category: insight.category,
            relevanceScore: insight.relevanceScore,
            source: 'ai-generated'
          })
        )
      );

      res.json(storedInsights);
    } else {
      res.json(insights);
    }
  }));

  app.get("/api/insights/recommendations", asyncHandler(async (req: Request, res: Response) => {
    const insights = await storage.getRecommendations();
    res.json(insights);
  }));

  app.post("/api/insights/realtime", asyncHandler(async (req: Request, res: Response) => {
    const { currentDiscussion, meetingContext } = req.body;

    if (!currentDiscussion || !meetingContext) {
      throw new ValidationError("Missing required fields", [
        { field: "currentDiscussion", message: "Current discussion is required" },
        { field: "meetingContext", message: "Meeting context is required" }
      ]);
    }

    const aiService = await getAIInsights();
    const recommendations = await aiService.getRealtimeRecommendations(
      currentDiscussion,
      meetingContext
    );

    res.json(recommendations.map((recommendation, index) => ({
      id: Date.now() + index, // Temporary ID for frontend rendering
      insight: recommendation,
      category: 'best_practice',
      relevanceScore: 8,
      source: 'realtime-ai'
    })));
  }));

  app.post("/api/meetings", asyncHandler(async (req: Request, res: Response) => {
    try {
      const meetingData = insertMeetingSchema.parse(req.body);
      const meeting = await storage.createMeeting(meetingData);

      // Broadcast the update to connected clients
      broadcastMeetingUpdate('create', meeting.id);

      res.status(201).json(meeting);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Invalid meeting data", error.errors);
      }
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

      // Broadcast the update to connected clients
      broadcastMeetingUpdate('update', meeting.id);

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

    // Broadcast the update to connected clients
    broadcastMeetingUpdate('delete', meeting.id);

    res.status(204).send();
  }));
    app.post("/api/meetings/:id/summarize", asyncHandler(async (req: Request, res: Response) => {
    try {
      const meeting = await storage.getMeeting(Number(req.params.id));
      if (!meeting) {
        throw new NotFoundError("Meeting");
      }

      const summary = await generateMeetingInsights(meeting);

      const updatedMeeting = await storage.updateMeeting(meeting.id, {
        summary: summary.summary
      });

      // Broadcast the update to connected clients
      broadcastMeetingUpdate('update', meeting.id);

      res.json({
        meeting: updatedMeeting,
        summaryDetails: summary
      });
    } catch (error) {
      console.error("Error generating meeting summary:", error);
      throw error;
    }
  }));
  // Scheduling Assistant Routes
  app.post("/api/meetings/suggest-times", authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    const { participantIds, duration, earliestStartTime, latestStartTime, requiredCapacity } = req.body;

    if (!participantIds?.length || !duration || !earliestStartTime || !latestStartTime) {
      throw new ValidationError("Missing required fields", [
        { field: "participantIds", message: "At least one participant is required" },
        { field: "duration", message: "Meeting duration is required" },
        { field: "earliestStartTime", message: "Earliest start time is required" },
        { field: "latestStartTime", message: "Latest start time is required" }
      ]);
    }

    const suggestions = await SchedulerService.suggestMeetingTimes(
      participantIds,
      duration,
      new Date(earliestStartTime),
      new Date(latestStartTime),
      requiredCapacity
    );

    res.json(suggestions);
  }));

  // Room Management Routes
  app.get("/api/rooms", asyncHandler(async (req: Request, res: Response) => {
    const rooms = await storage.getRooms();
    res.json(rooms);
  }));

  app.get("/api/rooms/available", asyncHandler(async (req: Request, res: Response) => {
    const { startTime, endTime, capacity } = req.query;

    if (!startTime || !endTime) {
      throw new ValidationError("Start time and end time are required");
    }

    const availableRooms = await storage.getAvailableRooms(
      new Date(startTime as string),
      new Date(endTime as string),
      capacity ? Number(capacity) : undefined
    );

    res.json(availableRooms);
  }));

  // User Availability Routes
  app.get("/api/users/:userId/availability", authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    const availability = await storage.getUserAvailability(Number(req.params.userId));
    res.json(availability);
  }));

  app.post("/api/users/:userId/availability", authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    const availability = await storage.setUserAvailability({
      userId: Number(req.params.userId),
      ...req.body
    });
    res.status(201).json(availability);
  }));

  // Meeting Preferences Routes
  app.get("/api/users/:userId/meeting-preferences", authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    const preferences = await storage.getMeetingPreferences(Number(req.params.userId));
    res.json(preferences);
  }));

  app.post("/api/users/:userId/meeting-preferences", authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    const preferences = await storage.setMeetingPreferences({
      userId: Number(req.params.userId),
      ...req.body
    });
    res.status(201).json(preferences);
  }));

  // Calendar Events Routes
  app.get("/api/users/:userId/calendar-events", authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError("Start date and end date are required");
    }

    const events = await storage.getUserCalendarEvents(
      Number(req.params.userId),
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json(events);
  }));

  // Register error handler last
  app.use(errorHandler);

  return createServer(app);
}