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
import {insertTaskSchema, updateTaskSchema} from "@shared/schema"; // Assuming these are defined elsewhere


// Utility function to validate meeting ID
function validateMeetingId(id: string): number {
  const meetingId = Number(id);
  if (isNaN(meetingId)) {
    throw new ValidationError("Invalid meeting ID", [
      { field: "id", message: "Meeting ID must be a valid number" }
    ]);
  }
  return meetingId;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Meeting Management Routes
  app.get("/api/meetings", asyncHandler(async (req: Request, res: Response) => {
    const meetings = await storage.getMeetings();
    res.json(meetings);
  }));

  // Add AI Insights Routes
  app.get("/api/meetings/:id/insights", asyncHandler(async (req: Request, res: Response) => {
    const meetingId = validateMeetingId(req.params.id);
    const meeting = await storage.getMeeting(meetingId);
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
    const meetingId = validateMeetingId(req.params.id);
    const meeting = await storage.getMeeting(meetingId);
    if (!meeting) {
      throw new NotFoundError("Meeting");
    }
    res.json(meeting);
  }));

  app.patch("/api/meetings/:id", asyncHandler(async (req: Request, res: Response) => {
    try {
      const meetingId = validateMeetingId(req.params.id);
      const meeting = await storage.getMeeting(meetingId);
      if (!meeting) {
        throw new NotFoundError("Meeting");
      }

      const meetingData = updateMeetingSchema.parse(req.body);
      const updatedMeeting = await storage.updateMeeting(meetingId, meetingData);

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
    const meetingId = validateMeetingId(req.params.id);
    const meeting = await storage.getMeeting(meetingId);
    if (!meeting) {
      throw new NotFoundError("Meeting");
    }

    await storage.deleteMeeting(meetingId);

    // Broadcast the update to connected clients
    broadcastMeetingUpdate('delete', meeting.id);

    res.status(204).send();
  }));

  app.post("/api/meetings/:id/summarize", asyncHandler(async (req: Request, res: Response) => {
    try {
      const meetingId = validateMeetingId(req.params.id);
      const meeting = await storage.getMeeting(meetingId);
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

  // Add these routes after the existing meeting routes
  app.get("/api/meetings/:id/moods", asyncHandler(async (req: Request, res: Response) => {
    const meetingId = validateMeetingId(req.params.id);
    const meeting = await storage.getMeeting(meetingId);
    if (!meeting) {
      throw new NotFoundError("Meeting");
    }

    const moods = await storage.getMeetingMoods(meetingId);
    res.json(moods);
  }));

  app.post("/api/meetings/:id/moods", asyncHandler(async (req: Request, res: Response) => {
    try {
      const meetingId = validateMeetingId(req.params.id);
      const meeting = await storage.getMeeting(meetingId);
      if (!meeting) {
        throw new NotFoundError("Meeting");
      }

      const moodData = req.body;
      const mood = await storage.createMeetingMood({
        meetingId,
        ...moodData
      });

      // Broadcast mood update to connected clients
      broadcastMeetingUpdate('moods', meetingId);

      res.status(201).json(mood);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Invalid mood data", error.errors);
      }
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

  // User Preferences Routes with Validation
  app.post("/api/users/preferences", authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    const { theme, dashboardLayout, preferredDuration, notifications } = req.body;

    // Validate required fields
    if (!theme || !dashboardLayout || !preferredDuration || !notifications) {
      throw new ValidationError("Missing required preferences", [
        { field: "theme", message: "Theme preference is required" },
        { field: "dashboardLayout", message: "Dashboard layout preference is required" },
        { field: "preferredDuration", message: "Preferred meeting duration is required" },
        { field: "notifications", message: "Notification preference is required" }
      ]);
    }

    // Validate theme values
    if (!["light", "dark", "system"].includes(theme)) {
      throw new ValidationError("Invalid theme value", [
        { field: "theme", message: "Theme must be one of: light, dark, system" }
      ]);
    }

    // Validate layout values
    if (!["compact", "comfortable", "spacious"].includes(dashboardLayout)) {
      throw new ValidationError("Invalid layout value", [
        { field: "dashboardLayout", message: "Layout must be one of: compact, comfortable, spacious" }
      ]);
    }

    // Validate notification values
    if (!["all", "important", "minimal"].includes(notifications)) {
      throw new ValidationError("Invalid notifications value", [
        { field: "notifications", message: "Notifications must be one of: all, important, minimal" }
      ]);
    }

    // Create or update preferences
    const preferences = await storage.setMeetingPreferences({
      userId: req.user.id,
      theme,
      dashboardLayout,
      preferredDuration: parseInt(preferredDuration),
      notifications
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

  // Add task routes after meeting routes
  app.get("/api/tasks", asyncHandler(async (req: Request, res: Response) => {
    const { meetingId, userId } = req.query;
    const tasks = await storage.getTasks({
      meetingId: meetingId ? Number(meetingId) : undefined,
      userId: userId ? Number(userId) : undefined
    });
    res.json(tasks);
  }));

  app.post("/api/tasks", asyncHandler(async (req: Request, res: Response) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Invalid task data", error.errors);
      }
      throw error;
    }
  }));

  app.patch("/api/tasks/:id", asyncHandler(async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);
      if (isNaN(taskId)) {
        throw new ValidationError("Invalid task ID", [
          { field: "id", message: "Task ID must be a valid number" }
        ]);
      }

      const task = await storage.getTask(taskId);
      if (!task) {
        throw new NotFoundError("Task");
      }

      const taskData = updateTaskSchema.parse(req.body);
      const updatedTask = await storage.updateTask(taskId, taskData);
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Invalid task data", error.errors);
      }
      throw error;
    }
  }));

  app.delete("/api/tasks/:id", asyncHandler(async (req: Request, res: Response) => {
    const taskId = Number(req.params.id);
    if (isNaN(taskId)) {
      throw new ValidationError("Invalid task ID", [
        { field: "id", message: "Task ID must be a valid number" }
      ]);
    }

    const task = await storage.getTask(taskId);
    if (!task) {
      throw new NotFoundError("Task");
    }

    await storage.deleteTask(taskId);
    res.status(204).send();
  }));

  // Register error handler last
  app.use(errorHandler);

  return createServer(app);
}