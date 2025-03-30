import express, { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { authenticateJWT } from '../auth';
import * as googleCalendar from '../services/google-calendar';
import * as outlookCalendar from '../services/outlook-calendar';
import * as calendarIntegration from '../services/calendar-integration';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { meetings } from '@shared/schema';
import { broadcastCalendarUpdate } from '../websocket';

// Set up rate limiting for calendar endpoints
const calendarLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 requests per window
  standardHeaders: true,
  message: { error: 'Too many calendar requests, please try again later' },
});

// Schema for validating date parameters
const dateRangeSchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
});

export function registerCalendarRoutes(app: express.Express) {
  // Get auth URL for Google Calendar
  app.get('/api/calendar/google/auth', authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const authUrl = googleCalendar.getAuthUrl(req.user.id);
    res.json({ authUrl });
  }));

  // Handle Google Calendar OAuth callback
  app.get('/api/calendar/google/callback', asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const result = await googleCalendar.handleCallback(code.toString(), state.toString());
    
    if (result.success) {
      // Redirect to calendar settings page with success message
      res.redirect(`/profile-settings?calendarConnected=true&provider=google`);
    } else {
      // Redirect with error
      res.redirect(`/profile-settings?calendarError=true&message=${encodeURIComponent(result.message)}`);
    }
  }));

  // Disconnect Google Calendar
  app.post('/api/calendar/google/disconnect', authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const result = await googleCalendar.disconnectGoogleCalendar(req.user.id);
    res.json(result);
  }));

  // Get auth URL for Outlook Calendar
  app.get('/api/calendar/outlook/auth', authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const authUrl = outlookCalendar.getAuthUrl(req.user.id);
    res.json({ authUrl });
  }));

  // Handle Outlook Calendar OAuth callback
  app.get('/api/calendar/outlook/callback', asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const result = await outlookCalendar.handleCallback(code.toString(), state.toString());
    
    if (result.success) {
      // Redirect to calendar settings page with success message
      res.redirect(`/profile-settings?calendarConnected=true&provider=outlook`);
    } else {
      // Redirect with error
      res.redirect(`/profile-settings?calendarError=true&message=${encodeURIComponent(result.message)}`);
    }
  }));

  // Disconnect Outlook Calendar
  app.post('/api/calendar/outlook/disconnect', authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const result = await outlookCalendar.disconnectOutlookCalendar(req.user.id);
    res.json(result);
  }));

  // Get calendar connection status
  app.get('/api/calendar/status', authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const status = await calendarIntegration.getCalendarConnectionStatus(req.user.id);
    res.json(status);
  }));

  // Generic disconnect endpoint
  app.post('/api/calendar/disconnect', authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const result = await calendarIntegration.disconnectCalendar(req.user.id);
    res.json(result);
  }));

  // Fetch calendar events
  app.get('/api/calendar/events', authenticateJWT, calendarLimiter, asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const validation = dateRangeSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid date range parameters', details: validation.error.format() });
    }
    
    const { startDate, endDate } = validation.data;
    
    const result = await calendarIntegration.fetchCalendarEvents(req.user.id, startDate, endDate);
    
    if (result.success) {
      // Broadcast calendar fetch event via WebSocket
      broadcastCalendarUpdate('fetch', req.user.id, undefined, result.provider ? String(result.provider) : undefined);
      res.json({ 
        events: result.events,
        provider: result.provider
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  }));

  // Sync a meeting to calendar
  app.post('/api/meetings/:id/sync-to-calendar', authenticateJWT, calendarLimiter, asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const meetingId = parseInt(req.params.id, 10);
    if (isNaN(meetingId)) {
      return res.status(400).json({ error: 'Invalid meeting ID' });
    }
    
    // Get meeting details from database
    const meeting = await db.query.meetings.findFirst({
      where: eq(meetings.id, meetingId),
    });
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Only meeting owner can sync
    if (meeting.userId !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const duration = req.body.duration || 60; // Default to 60 minutes if not specified
    
    const syncResult = await calendarIntegration.syncMeetingToCalendar(req.user.id, {
      ...meeting,
      duration
    });
    
    if (syncResult.success) {
      // Update meeting with calendar event ID
      await db.update(meetings)
        .set({
          calendarEventId: syncResult.eventId,
          calendarSynced: true,
          lastSyncedAt: new Date()
        })
        .where(eq(meetings.id, meetingId));
      
      // Broadcast calendar sync event via WebSocket
      broadcastCalendarUpdate('sync', req.user.id, meetingId, syncResult.provider ? String(syncResult.provider) : undefined);
      
      res.json({ 
        success: true, 
        message: 'Meeting synced to calendar successfully',
        eventId: syncResult.eventId,
        provider: syncResult.provider
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: syncResult.error 
      });
    }
  }));

  // Remove meeting from calendar
  app.post('/api/meetings/:id/remove-from-calendar', authenticateJWT, calendarLimiter, asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const meetingId = parseInt(req.params.id, 10);
    if (isNaN(meetingId)) {
      return res.status(400).json({ error: 'Invalid meeting ID' });
    }
    
    // Get meeting details from database
    const meeting = await db.query.meetings.findFirst({
      where: eq(meetings.id, meetingId),
    });
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Only meeting owner can remove
    if (meeting.userId !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Check if meeting is synced to calendar
    if (!meeting.calendarSynced || !meeting.calendarEventId) {
      return res.status(400).json({ error: 'Meeting is not synced to calendar' });
    }
    
    const deleteResult = await calendarIntegration.deleteMeetingFromCalendar(req.user.id, meeting.calendarEventId);
    
    if (deleteResult.success) {
      // Update meeting to remove calendar event ID
      await db.update(meetings)
        .set({
          calendarEventId: null,
          calendarSynced: false,
          lastSyncedAt: null
        })
        .where(eq(meetings.id, meetingId));
      
      // Broadcast calendar removal event via WebSocket
      broadcastCalendarUpdate('remove', req.user.id, meetingId, deleteResult.provider ? String(deleteResult.provider) : undefined);
      
      res.json({ 
        success: true, 
        message: 'Meeting removed from calendar successfully',
        provider: deleteResult.provider
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: deleteResult.error 
      });
    }
  }));
}