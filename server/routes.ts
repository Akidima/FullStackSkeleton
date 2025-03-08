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
import {insertTaskSchema, updateTaskSchema} from "@shared/schema";
import { format } from 'date-fns';
import { rateLimit } from 'express-rate-limit';
import { SlackService } from "./services/slack";
import { GoogleCalendarService } from "./services/google-calendar";
import { OutlookCalendarService } from "./services/outlook-calendar";
import { AsanaService } from "./services/asana";
import { JiraService } from "./services/jira";
import { MicrosoftTeamsService } from "./services/microsoft-teams";
import {meetingOptimizer} from "./services/ai-optimizer"; 

// Add these rate limiter configurations at the top of the file
const optimizationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Increased from 20 to 50 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many optimization requests. Please try again in a few minutes.',
    retryAfter: 'windowMs'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// More lenient rate limiter for authenticated endpoints
const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Allow 100 requests per window per IP
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
    retryAfter: 'windowMs'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for OPTIONS requests
    if (req.method === 'OPTIONS') return true;
    // Skip rate limiting if user is authenticated
    return !!req.user;
  }
});

// Rate limiter for unauthenticated endpoints
const analyticsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 1000, // Allow more requests per window
  message: {
    status: 'error',
    message: 'Rate limit exceeded. Please try again in a few minutes.',
    retryAfter: 'windowMs'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Skip preflight requests
});


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

      // Send Slack notification
      try {
        await SlackService.sendMeetingNotification(meeting);
      } catch (error) {
        console.error('Error sending Slack notification:', error);
        // Don't fail the whole request if Slack notification fails
      }

      // Handle calendar integration if user has provided token
      if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];
        const calendarType = req.headers['x-calendar-type'] || 'google'; // Default to Google Calendar
        let eventId;

        try {
          if (calendarType === 'outlook') {
            eventId = await OutlookCalendarService.createCalendarEvent(meeting, token);
          } else {
            eventId = await GoogleCalendarService.createCalendarEvent(meeting, token);
          }

          // Store the calendar event ID with the meeting
          await storage.updateMeeting(meeting.id, {
            calendarEventId: eventId,
            calendarSynced: true,
            lastSyncedAt: new Date()
          });
        } catch (error) {
          console.error('Failed to create calendar event:', error);
          // Don't fail the whole request if calendar sync fails
        }
      }

      // Broadcast the update
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

      // Send Slack notification
      await SlackService.updateMeetingStatus(updatedMeeting, 'updated');

      // Update calendar event if exists and user has token
      if (meeting.calendarEventId && req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];
        const calendarType = req.headers['x-calendar-type'] || 'google';

        try {
          if (calendarType === 'outlook') {
            await OutlookCalendarService.updateCalendarEvent(updatedMeeting, meeting.calendarEventId, token);
          } else {
            await GoogleCalendarService.updateCalendarEvent(updatedMeeting, meeting.calendarEventId, token);
          }

          // Update sync status
          await storage.updateMeeting(meetingId, {
            calendarSynced: true,
            lastSyncedAt: new Date()
          });
        } catch (error) {
          console.error('Failed to update calendar event:', error);
          // Don't fail the whole request if calendar sync fails
        }
      }

      // Broadcast the update
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
    try {
      const meetingId = validateMeetingId(req.params.id);
      const meeting = await storage.getMeeting(meetingId);

      if (!meeting) {
        throw new NotFoundError("Meeting");
      }

      // Delete calendar event if exists and user has token
      if (meeting.calendarEventId && req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];
        const calendarType = req.headers['x-calendar-type'] || 'google';

        try {
          if (calendarType === 'outlook') {
            await OutlookCalendarService.deleteCalendarEvent(meeting.calendarEventId, token);
          } else {
            await GoogleCalendarService.deleteCalendarEvent(meeting.calendarEventId, token);
          }
        } catch (error) {
          console.error('Failed to delete calendar event:', error);
          // Don't fail the whole request if calendar sync fails
        }
      }

      // Delete the meeting from storage
      await storage.deleteMeeting(meetingId);

      // Broadcast the deletion
      broadcastMeetingUpdate('delete', meetingId);

      // Send a proper response
      res.status(200).json({ 
        success: true,
        message: 'Meeting deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting meeting:', error);
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error('Failed to delete meeting. Please try again.');
    }
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

      // Send meeting summary to Slack
      await SlackService.sendMeetingSummary(updatedMeeting, summary.summary);

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

  // Update the optimization suggestions endpoint
  app.get("/api/meetings/optimization-suggestions", optimizationLimiter, asyncHandler(async (req: Request, res: Response) => {
    try {
      const meetings = await storage.getMeetings();
      const suggestions = await meetingOptimizer.generateOptimizationSuggestions(meetings);

      // Add strong cache headers
      res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      res.set('Vary', 'Accept-Encoding');

      res.json(suggestions);
    } catch (error) {
      console.error('Error generating optimization suggestions:', error);

      // Check if it's an AI model initialization error
      if (error instanceof Error && error.message.includes('Failed to initialize AI')) {
        res.status(503).json({
          status: 'error',
          message: 'AI service temporarily unavailable. Please try again in a few moments.'
        });
        return;
      }

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


  // Add unified settings endpoint after existing user routes
  app.get("/api/users/settings", authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        throw new ValidationError("Authentication required");
      }

      const userId = req.user.id;

      // Fetch all settings
      const [profile, preferences, notifications, integrations] = await Promise.all([
        storage.getUser(userId),
        storage.getUserPreferences(userId),
        storage.getUserNotifications(userId),
        storage.getUserIntegrationSettings(userId)
      ]);

      // Return combined settings
      res.json({
        profile: profile || {},
        preferences: preferences || {
          theme: "system",
          dashboardLayout: "comfortable",
          preferredDuration: 30,
          notifications: "all"
        },
        notifications: notifications || {
          emailEnabled: true,
          emailFrequency: "daily",
          meetingReminders: true,
          meetingUpdates: true,
          taskReminders: true,
          taskUpdates: true
        },
        integrations: integrations || {
          asanaEnabled: false,
          jiraEnabled: false,
          teamsEnabled: false,
          slackEnabled: false,
          googleCalendarEnabled: false,
          outlookCalendarEnabled: false
        }
      });
    } catch (error) {
      console.error('Error fetching user settings:', error);
      throw error;
    }
  }));

  // Update profile endpoint
  app.patch("/api/users/profile", authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        throw new ValidationError("Authentication required");
      }

      const userId = req.user.id;
      const profileData = req.body;

      // Validate profile data
      if (!profileData || typeof profileData !== 'object') {
        throw new ValidationError("Invalid profile data");
      }

      // Update user profile
      const updatedProfile = await storage.updateUser(userId, profileData);

      res.json(updatedProfile);
    } catch (error) {
      console.error('Error updating user profile:', error);
      if (error instanceof ValidationError) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          details: error.details
        });
      } else {
        throw error;
      }
    }
  }));

  // Update the integration settings endpoints
  app.get("/api/users/integrations", authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        throw new ValidationError("Authentication required");
      }

      const integrationSettings = await storage.getUserIntegrationSettings(req.user.id);
      if (!integrationSettings) {
        // Return default settings if none exist
        return res.json({
          asanaEnabled: false,
          jiraEnabled: false,
          teamsEnabled: false,
          slackEnabled: false,
          googleCalendarEnabled: false,
          outlookCalendarEnabled: false,
          asanaWorkspace: null,
          jiraProject: null,
          slackChannel: null,
          teamsChannel: null
        });
      }
      res.json(integrationSettings);
    } catch (error) {
      console.error('Error fetching integration settings:', error);
      throw error;
    }
  }));

  app.patch("/api/users/integrations", authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        throw new ValidationError("Authentication required");
      }

      const userId = req.user.id;
      const settings = req.body;

      // Validate request body
      if (!settings || typeof settings !== 'object') {
        throw new ValidationError("Invalid request body");
      }

      // Type check and sanitize boolean fields
      const sanitizedSettings = {
        asanaEnabled: Boolean(settings.asanaEnabled),
        jiraEnabled: Boolean(settings.jiraEnabled),
        teamsEnabled: Boolean(settings.teamsEnabled),
        slackEnabled: Boolean(settings.slackEnabled),
        googleCalendarEnabled: Boolean(settings.googleCalendarEnabled),
        outlookCalendarEnabled: Boolean(settings.outlookCalendarEnabled),
        // Optional string fields
        asanaWorkspace: settings.asanaWorkspace || null,
        jiraProject: settings.jiraProject || null,
        slackChannel: settings.slackChannel || null,
        teamsChannel: settings.teamsChannel || null
      };

      // Update settings in database
      const updatedSettings = await storage.updateUserIntegrationSettings(userId, sanitizedSettings);

      // Send response
      res.json(updatedSettings);
    } catch (error) {
      console.error('Error updating integration settings:', error);
      if (error instanceof ValidationError) {
        res.status(400).json({
          status: 'error',
          message: error.message,
          details: error.details
        });
      } else {
        throw error;
      }
    }
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

      // Handle external integrations
      const integrations = req.body.integrations || {};
      const errors: any[] = [];

      // Distribute task to Asana if enabled
      if (integrations.asana?.enabled && integrations.asana?.accessToken) {
        try {
          const asanaTaskId = await AsanaService.createTask(task, integrations.asana.accessToken);
          await storage.updateTask(task.id, {
            ...task,
            asanaId: asanaTaskId
          });
        } catch (error) {
          console.error('Asana integration error:', error);
          errors.push({ service: 'Asana', error: error.message });
        }
      }

      // Create Jira issue if enabled
      if (integrations.jira?.enabled && integrations.jira?.credentials) {
        try {
          const jiraTaskId = await JiraService.createTask(task, integrations.jira.credentials);
          await storage.updateTask(task.id, {
            ...task,
            jiraId: jiraTaskId
          });
        } catch (error) {
          console.error('Jira integration error:', error);
          errors.push({ service: 'Jira', error: error.message });
        }
      }

      // Send Teams notification if enabled
      if (integrations.teams?.enabled && integrations.teams?.webhookUrl) {
        try {
          await MicrosoftTeamsService.sendMeetingNotification({
            ...task,
            date: new Date(),
            title: `New Task: ${task.title}`
          }, integrations.teams.webhookUrl);
        } catch (error) {
          console.error('Teams integration error:', error);
          errors.push({ service: 'Microsoft Teams', error: error.message });
        }
      }

      // Return created task along with any integration errors
      res.status(201).json({
        task,
        integrationErrors: errors.length > 0 ? errors : undefined
      });
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
        throw new ValidationError("Invalid task ID");
      }

      const task = await storage.getTask(taskId);
      if (!task) {
        throw new NotFoundError("Task");
      }

      const taskData = updateTaskSchema.parse(req.body);
      const updatedTask = await storage.updateTask(taskId, taskData);

      // Handle external integrations updates
      const integrations = req.body.integrations || {};
      const errors: any[] = [];

      // Update Asana task if connected
      if (task.asanaId && integrations.asana?.accessToken) {
        try {
          await AsanaService.updateTask(task.asanaId, updatedTask, integrations.asana.accessToken);
        } catch (error) {
          console.error('Asana update error:', error);
          errors.push({ service: 'Asana', error: error.message });
        }
      }

      // Update Jira issue if connected
      if (task.jiraId && integrations.jira?.credentials) {
        try {
          await JiraService.updateTask(task.jiraId, updatedTask, integrations.jira.credentials);
        } catch (error) {
          console.error('Jira update error:', error);
          errors.push({ service: 'Jira', error: error.message });
        }
      }

      // Send Teams update if enabled
      if (integrations.teams?.webhookUrl) {
        try {
          await MicrosoftTeamsService.updateMeetingStatus({
            ...updatedTask,
            date: new Date(),
            title: `Task Update: ${updatedTask.title}`
          }, 'updated', integrations.teams.webhookUrl);
        } catch (error) {
          console.error('Teams update error:', error);
          errors.push({ service: 'Microsoft Teams', error: error.message });
        }
      }

      res.json({
        task: updatedTask,
        integrationErrors: errors.length > 0 ? errors : undefined
      });
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

  // Add these routes after existing routes but before error handler
  app.use('/auth', authenticatedLimiter); // Apply auth rate limiter
  app.use('/api/analytics', analyticsLimiter); // Apply rate limiter

  app.get("/api/analytics/meetings", analyticsLimiter, asyncHandler(async (req: Request, res: Response) => {
    try {
      const meetings = await storage.getMeetings();

      // Group meetings by week
      const weeklyMeetings = meetings.reduce((acc: any[], meeting) => {
        const week = format(new Date(meeting.date), 'MM/dd');
        const existingWeek = acc.find(w => w.week === week);
        if (existingWeek) {
          existingWeek.count++;
        } else {
          acc.push({ week, count: 1 });
        }
        return acc;
      }, []);

      // Add strong cache headers
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes cache
      res.set('Vary', 'Accept-Encoding');

      res.json({
        weeklyMeetings: weeklyMeetings.slice(-7), // Last 7 weeks
        totalMeetings: meetings.length,
        completedMeetings: meetings.filter(m => m.isCompleted).length,
      });
    } catch (error) {
      console.error('Error generating meeting analytics:', error);
      throw error;
    }
  }));

  app.get("/api/analytics/participation", analyticsLimiter, asyncHandler(async (req: Request, res: Response) => {
    try {
      const meetings = await storage.getMeetings();
      const totalParticipants = meetings.reduce((sum, meeting) =>
        sum + (meeting.participants?.length || 0), 0);

      const participation = [
        { name: "Attended", value: totalParticipants },
        { name: "No Show", value: Math.round(totalParticipants * 0.1) }, // Example: 10% no-show rate
        { name: "Rescheduled", value: Math.round(totalParticipants * 0.05) }, // Example: 5% reschedule rate
      ];

      // Add strong cache headers
      res.set('Cache-Control', 'public, max-age=300');
      res.set('Vary', 'Accept-Encoding');

      res.json({ participation });
    } catch (error) {
      console.error('Error generating participation analytics:', error);
      throw error;
    }
  }));

  app.get("/api/analytics/rooms", analyticsLimiter, asyncHandler(async (req: Request, res: Response) => {
    try {
      const rooms = await storage.getRooms();
      const meetings = await storage.getMeetings();

      // Calculate room utilization
      const roomUtilization = rooms.map(room => {
        const roomMeetings = meetings.filter(m => m.roomId === room.id);
        const utilization = (roomMeetings.length / meetings.length) * 100;
        return {
          name: room.name,
          utilization: Math.round(utilization),
        };
      });

      // Cache headers
      res.set('Cache-Control', 'public, max-age=300');
      res.set('Vary', 'Accept-Encoding');

      res.json({ rooms: roomUtilization });
    } catch (error) {
      console.error('Error generating room analytics:', error);
      throw error;
    }
  }));

  // Add these routes after existing routes but before error handler
  app.get("/api/team/productivity/milestones", analyticsLimiter, asyncHandler(async (req: Request, res: Response) => {
    try {
      // Add strong cache headers
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes cache
      res.set('Vary', 'Accept-Encoding');

      // Return mock milestone data for initial testing
      const milestones = [
        {
          id: 1,
          title: "Q1 Goals",
          dueDate: new Date("2025-03-31").toISOString(),
          progress: 75,
          status: "in-progress"
        },
        {
          id: 2,
          title: "Team Training",
          dueDate: new Date("2025-04-15").toISOString(),
          progress: 40,
          status: "in-progress"
        },
        {
          id: 3,
          title: "Project Launch",
          dueDate: new Date("2025-05-01").toISOString(),
          progress: 20,
          status: "pending"
        }
      ];

      res.json(milestones);
    } catch (error) {
      console.error('Error fetching productivity milestones:', error);
      throw error;
    }
  }));

  // Register error handler last
  app.use(errorHandler);

  return createServer(app);
}

// Fix the syntax error in the validateMeetingId function
function validateMeetingId(id: string): number {
  const meetingId = Number(id);
  if (isNaN(meetingId)) {
    throw new ValidationError("Invalid meeting ID", [
      { field: "id", message: "Meeting ID must be a valid number" }
    ]);
  }
  return meetingId;
}