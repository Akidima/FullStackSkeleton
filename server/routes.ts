import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupWebSocket, broadcastMeetingUpdate, broadcastRegistrationAttempt, broadcastSystemStatus, wss } from './websocket';
import { WebSocketServer, WebSocket } from 'ws';
import { insertMeetingSchema, updateMeetingSchema } from "@shared/schema";
import { ZodError } from "zod";
import { errorHandler, asyncHandler } from "./middleware/errorHandler";
import { NotFoundError, ValidationError } from "./errors/AppError";
import { AgendaService } from "./services/agenda";
import { SchedulerService } from "./services/scheduler";
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
import * as claudeAI from "./services/claude-ai";

// Temporarily disable rate limiting for basic functionality
const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Set very high to effectively disable
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
    retryAfter: 'windowMs'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => true // Skip rate limiting for all requests temporarily
});

// Set other limiters to skip all requests
const meetingEndpointsLimiter = authenticatedLimiter;
const roomAvailabilityLimiter = authenticatedLimiter;
const voiceRecognitionLimiter = authenticatedLimiter;
const sentimentLimiter = authenticatedLimiter;
const optimizationLimiter = authenticatedLimiter;
const analyticsLimiter = authenticatedLimiter;

// Update the meeting schema to include calendar-related fields
export interface Meeting {
  id: number;
  date: Date;
  title: string;
  description: string | null;
  participants: string[] | null;
  agenda: string | null;
  notes: string | null;
  isCompleted: boolean;
  summary: string | null;
  userId: number | null;
  roomId: number | null;
  calendarEventId?: string;
  calendarSynced?: boolean;
  lastSyncedAt?: Date;
}

// Fix the error handling types
interface ErrorResponse {
  message: string;
  details?: Record<string, any>;
}

interface PreferencesUpdateInput {
  theme: 'light' | 'dark' | 'system';
  dashboardLayout: 'compact' | 'comfortable' | 'spacious';
  preferredDuration: number;
  notifications: 'all' | 'important' | 'minimal';
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Meeting Management Routes
  app.get("/api/meetings", asyncHandler(async (req: Request, res: Response) => {
    try {
      // Always return mock data for development
      // Current date
      const now = new Date();
      
      // Create a set of mock meetings for the next 7 days
      const mockMeetings = [
        {
          id: 1,
          title: "Product Team Sync",
          description: "Weekly sync to discuss product roadmap and current sprint progress",
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0),
          participants: ["Sarah Kim", "David Chen", "Alex Johnson"],
          agenda: "1. Sprint review\n2. Blockers discussion\n3. Customer feedback",
          notes: "",
          isCompleted: false,
          summary: null,
          userId: 1,
          roomId: 1
        },
        {
          id: 2,
          title: "Marketing Campaign Planning",
          description: "Planning session for the Q2 marketing campaign launch",
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 14, 30, 0),
          participants: ["Maria Garcia", "Taylor Swift", "Chris Wong"],
          agenda: "1. Campaign goals\n2. Budget allocation\n3. Timeline review",
          notes: "",
          isCompleted: false,
          summary: null,
          userId: 1,
          roomId: 2
        },
        {
          id: 3,
          title: "Customer Success Review",
          description: "Monthly review of customer success metrics and support tickets",
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 11, 0, 0),
          participants: ["James Smith", "Olivia Johnson", "Raj Patel"],
          agenda: "1. KPI review\n2. Support ticket analysis\n3. Customer retention strategies",
          notes: "",
          isCompleted: false,
          summary: null,
          userId: 1,
          roomId: 3
        },
        {
          id: 4,
          title: "Engineering Stand-up",
          description: "Daily stand-up meeting for the engineering team",
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
          participants: ["Liam Wilson", "Emma Davis", "Noah Martin", "Isabella Brown"],
          agenda: "1. Yesterday's progress\n2. Today's goals\n3. Blockers",
          notes: "Team discussed front-end performance issues. Noah will focus on optimizing image loading. Emma completed the authentication flow updates.",
          isCompleted: true,
          summary: "The team made good progress on the authentication flow, and plans to address performance optimization today. Noah will lead the image loading optimization effort.",
          userId: 1,
          roomId: 1
        },
        {
          id: 5,
          title: "Board Meeting",
          description: "Quarterly board meeting to review company performance and strategy",
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 13, 0, 0),
          participants: ["Daniel Lee", "Sophia Clark", "William Jackson", "Ava White"],
          agenda: "1. Financial review\n2. Strategic initiatives\n3. Market analysis\n4. Q&A",
          notes: "",
          isCompleted: false,
          summary: null,
          userId: 1,
          roomId: 4
        }
      ];
      
      // Set CORS headers to make sure the API is accessible
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      
      console.log("Returning mock meetings data for development");
      // Add a small delay to simulate network latency
      setTimeout(() => {
        res.json(mockMeetings);
      }, 100);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      // Return an empty array instead of throwing an error to improve resilience
      res.json([]);
    }
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
      try {
        const previousOutcomes = await storage.getMeetingOutcomes(meeting.id);
        const generatedInsights = await claudeAI.generateMeetingInsights(meeting);

        // Store and return the generated insights
        const storedInsights = await Promise.all(
          generatedInsights.map(insight =>
            storage.createMeetingInsight({
              meetingId: meeting.id,
              insight: insight.insight,
              category: insight.category,
              relevanceScore: insight.relevanceScore,
              source: 'claude-ai'
            })
          )
        );

        res.json(storedInsights);
      } catch (error) {
        console.error("Error generating meeting insights with Claude:", error);
        res.status(503).json({
          status: 'error',
          message: 'AI service temporarily unavailable. Please try again in a few moments.'
        });
      }
    } else {
      res.json(insights);
    }
  }));

  app.post("/api/meetings", meetingEndpointsLimiter, asyncHandler(async (req: Request, res: Response) => {
    try {
      const meetingData = insertMeetingSchema.parse(req.body);
      const meeting = await storage.createMeeting(meetingData);

      // Send Slack notification
      try {
        await SlackService.sendMeetingNotification(meeting);
      } catch (error) {
        console.error('Error sending MeetMate Slack notification:', error);
        // Don't fail the whole request if Slack notification fails
      }

      // Broadcast meeting creation via WebSocket
      broadcastMeetingUpdate('create', meeting.id);

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


      res.status(201).json(meeting);
    } catch (error) {
      console.error('MeetMate meeting creation error:', error);
      if (error instanceof ZodError) {
        throw new ValidationError("Invalid MeetMate meeting data", error.errors);
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

  app.patch("/api/meetings/:id", meetingEndpointsLimiter, asyncHandler(async (req: Request, res: Response) => {
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

      // Broadcast meeting update via WebSocket
      broadcastMeetingUpdate('update', meetingId);

      res.json(updatedMeeting);
    } catch (error) {
      console.error('MeetMate meeting update error:', error);
      if (error instanceof ZodError) {
        throw new ValidationError("Invalid MeetMate meeting data", error.errors);
      }
      throw error;
    }
  }));

  app.delete("/api/meetings/:id", meetingEndpointsLimiter, asyncHandler(async (req: Request, res: Response) => {
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

      // Broadcast meeting deletion via WebSocket
      broadcastMeetingUpdate('delete', meetingId);

      // Send a proper response
      res.status(200).json({
        success: true,
        message: 'Meeting deleted successfully'
      });
    } catch (error) {
      console.error('MeetMate meeting deletion error:', error);
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error('Failed to delete MeetMate meeting. Please try again.');
    }
  }));

  app.post("/api/meetings/:id/summarize", asyncHandler(async (req: Request, res: Response) => {
    try {
      const meetingId = validateMeetingId(req.params.id);
      const meeting = await storage.getMeeting(meetingId);
      if (!meeting) {
        throw new NotFoundError("Meeting");
      }

      // Use Claude AI to generate the summary
      const summary = await claudeAI.generateMeetingSummary(meeting);

      // Update meeting with summary
      const updatedMeeting = await storage.updateMeeting(meeting.id, {
        summary: summary.summary
      });

      // For now, use a placeholder for notes analysis until we implement it in claude-ai.ts
      const analysisResult = {
        discussionPoints: summary.topics || [],
        actionItems: summary.actionItems?.map(item => item.task) || [],
        decisions: summary.decisions || []
      };

      // Send meeting summary to Slack
      if (updatedMeeting) {
        await SlackService.sendMeetingSummary(updatedMeeting, summary);
      }

      // Broadcast meeting notes update via WebSocket
      broadcastMeetingUpdate('notes', meeting.id);

      res.json({
        meeting: updatedMeeting,
        summaryDetails: {
          summary,
          keyPoints: analysisResult.discussionPoints,
          actionItems: analysisResult.actionItems,
          decisions: analysisResult.decisions,
          sentiment: {
            overall: 'neutral', // Claude doesn't provide sentiment in basic analysis
            score: 0.5
          }
        }
      });
    } catch (error) {
      console.error("Error generating meeting summary with Claude:", error);
      res.status(503).json({
        status: 'error',
        message: 'AI service temporarily unavailable. Please try again in a few moments.'
      });
    }
  }));

  // Update the optimization suggestions endpoint to use Claude AI
  app.get("/api/meetings/optimization-suggestions", optimizationLimiter, asyncHandler(async (req: Request, res: Response) => {
    try {
      const meetings = await storage.getMeetings();
      
      // Use Claude AI to generate optimization suggestions
      const optimizationResult = await claudeAI.generateMeetingOptimizations(meetings);
      
      // Convert to the expected format
      const suggestionsList = [
        ...optimizationResult.scheduleSuggestions || [],
        ...optimizationResult.efficiencyTips || []
      ];
      
      // Convert to the expected format
      const suggestions = suggestionsList.map(suggestion => ({
        type: 'efficiency',
        suggestion,
        confidence: 0.8,
        reasoning: 'Generated by Claude AI based on meeting patterns analysis'
      }));

      // Add strong cache headers
      res.set('Cache-Control', 'public, max-age=900'); // Cache for 15 minutes
      res.set('Vary', 'Accept-Encoding');
      res.set('ETag', Math.random().toString(36).substring(7));

      res.json({ suggestions });
    } catch (error) {
      console.error('Error generating optimization suggestions with Claude:', error);

      // Return a friendly error message
      res.status(503).json({
        status: 'error',
        message: 'AI service temporarily unavailable. Please try again in a few moments.'
      });
    }
  }));

  // Update the sentiment routes with rate limiting and caching
  app.get("/api/meetings/:id/moods", sentimentLimiter, asyncHandler(async (req: Request, res: Response) => {
    const meetingId = validateMeetingId(req.params.id);
    const meeting = await storage.getMeeting(meetingId);
    if (!meeting) {
      throw new NotFoundError("Meeting");
    }

    // Add strong cache headers
    res.set('Cache-Control', 'public, max-age=900'); // Cache for 15 minutes
    res.set('Vary', 'Accept-Encoding');
    res.set('ETag', Math.random().toString(36).substring(7));

    const moods = await storage.getMeetingMoods(meetingId);
    res.json(moods);
  }));

  // Update the routes to use proper types
  app.post("/api/meetings/:id/moods", sentimentLimiter, asyncHandler(async (req: Request, res: Response) => {
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

      // Cache control for POST response
      res.set('Cache-Control', 'no-cache');
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

  app.get("/api/rooms/available", roomAvailabilityLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { startTime, endTime, capacity } = req.query;

    if (!startTime || !endTime) {
      throw new ValidationError("Start time and end time are required");
    }

    const availableRooms = await storage.getAvailableRooms(
      new Date(startTime as string),
      new Date(endTime as string),
      capacity ? Number(capacity) : undefined
    );

    // Add cache headers for room availability
    res.set('Cache-Control', 'public, max-age=60'); // Cache for 1 minute
    res.set('Vary', 'Accept-Encoding');

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
    try {
      // Always return mock data for development purposes
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0);
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10, 0, 0);
      
      const mockTasks = [
        {
          id: 1,
          title: "Prepare product roadmap presentation",
          description: "Create slides for Q2 roadmap review with stakeholders",
          status: "in_progress",
          priority: "high",
          progress: 70,
          completed: false,
          dueDate: tomorrow,
          meetingId: 1,
          createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
          updatedAt: now
        },
        {
          id: 2,
          title: "Update user onboarding flow",
          description: "Implement new onboarding process based on UX research",
          status: "pending", 
          priority: "medium",
          progress: 0,
          completed: false,
          dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
          meetingId: 1,
          createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
          updatedAt: now
        },
        {
          id: 3,
          title: "Finalize Q2 marketing budget",
          description: "Review and approve budget allocation for next quarter campaigns",
          status: "completed",
          priority: "high",
          progress: 100,
          completed: true,
          dueDate: yesterday,
          meetingId: 2,
          createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5),
          updatedAt: yesterday
        },
        {
          id: 4,
          title: "Schedule customer feedback sessions",
          description: "Coordinate with existing customers for feedback on new features",
          status: "in_progress",
          priority: "medium",
          progress: 50,
          completed: false,
          dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2),
          meetingId: 3,
          createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
          updatedAt: now
        },
        {
          id: 5,
          title: "Fix critical login bug",
          description: "Address issue with authentication flow for enterprise customers",
          status: "blocked",
          priority: "high",
          progress: 30,
          completed: false,
          dueDate: tomorrow,
          meetingId: 4,
          createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
          updatedAt: now
        }
      ];
      
      // Set CORS headers to make sure the API is accessible
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      
      console.log("Returning mock tasks data for development");
      
      // Filter by meetingId or userId if specified
      const meetingId = req.query.meetingId ? Number(req.query.meetingId) : undefined;
      const userId = req.query.userId ? Number(req.query.userId) : undefined;
      
      let filteredTasks = [...mockTasks];
      
      if (meetingId) {
        filteredTasks = filteredTasks.filter(task => task.meetingId === meetingId);
      }
      
      // Add a small delay to simulate network latency
      setTimeout(() => {
        res.json(filteredTasks);
      }, 100);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // Return an empty array instead of throwing an error to improve resilience
      res.json([]);
    }
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
  app.use('/api/voice/*', voiceRecognitionLimiter);
  app.use('/auth', authenticatedLimiter);
  app.use('/api/analytics/*', analyticsLimiter);
  app.use('/api/meetings/*', meetingEndpointsLimiter); // Apply to all meeting endpoints app.use('/api/rooms/available', roomAvailabilityLimiter); // Apply to room availability endpoint

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
    } catch (error) {      console.error('Error generating meeting analytics:', error);
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
  
  // Add endpoint for meeting notes
  app.get("/api/meetings/notes", asyncHandler(async (req: Request, res: Response) => {
    try {
      // Always return mock data for development
      const now = new Date();
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const twoDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
      const threeDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3);
      
      const mockNotes = [
        {
          id: 1,
          meetingTitle: "Product Team Sync",
          content: "Decision made to prioritize the new checkout flow for Q2. Team agreed that improving conversion rate is our top priority for the quarter.",
          createdAt: yesterday.toISOString()
        },
        {
          id: 2,
          meetingTitle: "Engineering Stand-up",
          content: "Frontend team will complete authentication flow by end of week. Backend team working on API optimization for better performance.",
          createdAt: twoDaysAgo.toISOString()
        },
        {
          id: 3,
          meetingTitle: "Marketing Campaign Planning",
          content: "Budget allocated for digital advertising increased by 20%. Focus on social media channels with best ROI from previous quarter.",
          createdAt: threeDaysAgo.toISOString()
        }
      ];
      
      // Set CORS headers to make sure the API is accessible
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      
      console.log("Returning mock meeting notes for development");
      // Add a small delay to simulate network latency
      setTimeout(() => {
        res.json(mockNotes);
      }, 100);
    } catch (error) {
      console.error('Error fetching meeting notes:', error);
      // Return an empty array instead of throwing an error to improve resilience
      res.json([]);
    }
  }));

  // Register error handler last
  app.use(errorHandler);

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Add WebSocket-specific API routes
  app.post("/api/websocket/message", authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    try {
      const { type, messageData } = req.body;
      
      if (!type || typeof type !== 'string') {
        throw new ValidationError("Invalid message type");
      }
      
      // Handle different message types
      switch (type) {
        case 'meeting:update':
          if (messageData && typeof messageData.meetingId === 'number') {
            broadcastMeetingUpdate('update', messageData.meetingId);
            res.json({ success: true, message: "Update broadcast sent" });
          } else {
            throw new ValidationError("Invalid meeting ID for update");
          }
          break;
          
        case 'meeting:notes':
          if (messageData && typeof messageData.meetingId === 'number') {
            broadcastMeetingUpdate('notes', messageData.meetingId);
            res.json({ success: true, message: "Notes update broadcast sent" });
          } else {
            throw new ValidationError("Invalid meeting ID for notes update");
          }
          break;
          
        case 'registration:attempt':
          if (messageData && 
              typeof messageData.email === 'string' && 
              typeof messageData.ipAddress === 'string' && 
              ['success', 'pending', 'blocked'].includes(messageData.status)) {
            
            // Track the attempt in database if needed
            // await storage.createRegistrationAttempt({
            //   ...messageData,
            //   attemptTime: new Date()
            // });
            
            // Broadcast to admin dashboards
            broadcastRegistrationAttempt({
              email: messageData.email,
              ipAddress: messageData.ipAddress,
              status: messageData.status as 'success' | 'pending' | 'blocked',
              reason: messageData.reason,
              userAgent: messageData.userAgent
            });
            
            res.json({ success: true, message: "Registration attempt broadcast sent" });
          } else {
            throw new ValidationError("Invalid registration attempt data");
          }
          break;
          
        case 'system:status':
          if (messageData && 
              ['healthy', 'degraded', 'outage'].includes(messageData.status)) {
            
            // Broadcast system status
            broadcastSystemStatus(
              messageData.status as 'healthy' | 'degraded' | 'outage',
              messageData.details
            );
            
            res.json({ success: true, message: "System status broadcast sent" });
          } else {
            throw new ValidationError("Invalid system status data");
          }
          break;
          
        default:
          res.json({ success: false, message: "Unsupported message type" });
      }
    } catch (error) {
      console.error('WebSocket message API error:', error);
      throw error;
    }
  }));
  
  // Create a health check endpoint for the WebSocket server
  app.get("/api/websocket/status", asyncHandler(async (req: Request, res: Response) => {
    try {
      // Check if the WebSocket server is running
      if (wss?.clients) {
        // Return the number of active connections
        const activeConnections = [...wss.clients].filter(
          client => client.readyState === WebSocket.OPEN
        ).length;
        
        res.json({ 
          status: 'active',
          path: "/ws/app",
          connections: activeConnections,
          timestamp: new Date().toISOString()
        });
      } else {
        res.json({ 
          status: 'inactive',
          path: "/ws/app",
          message: 'WebSocket server not initialized',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error checking WebSocket status:', error);
      res.status(500).json({
        status: 'error',
        message: 'Could not determine WebSocket server status',
        timestamp: new Date().toISOString()
      });
    }
  }));
  
  // Set up WebSocket with improved logging
  console.log('Initializing WebSocket server on path: /ws/app');
  setupWebSocket(httpServer);
  
  return httpServer;
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

type UpdateType = "delete" | "notes" | "create" | "update" | "sentiment";