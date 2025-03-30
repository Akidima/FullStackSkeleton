import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Constants for Google OAuth
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/google/callback';

/**
 * Create OAuth2 client for Google API
 */
export function createOAuth2Client(): OAuth2Client {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
  return client;
}

/**
 * Generate authentication URL for Google Calendar
 */
export function getAuthUrl(userId: number): string {
  const oauth2Client = createOAuth2Client();
  
  // Store the userId in the state parameter to retrieve it in the callback
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force to get refresh_token every time
    state: userId.toString(),
  });
}

/**
 * Handle Google OAuth callback and store tokens
 */
export async function handleCallback(code: string, state: string): Promise<{ success: boolean; message: string }> {
  const userId = parseInt(state, 10);
  if (isNaN(userId)) {
    return { success: false, message: 'Invalid state parameter' };
  }

  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in the database
    await db.update(users)
      .set({
        googleRefreshToken: tokens.refresh_token,
        googleAccessToken: tokens.access_token,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleCalendarConnected: true,
        calendarProvider: 'google'
      })
      .where(eq(users.id, userId));
    
    return { success: true, message: 'Google Calendar connected successfully' };
  } catch (error) {
    console.error('Error getting Google tokens:', error);
    return { success: false, message: 'Failed to connect Google Calendar' };
  }
}

/**
 * Get authorized Google Calendar client for a user
 */
export async function getCalendarClient(userId: number): Promise<calendar_v3.Calendar | null> {
  try {
    // Get user's Google tokens
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiry: true,
        googleCalendarConnected: true
      }
    });

    if (!userRecord || !userRecord.googleCalendarConnected || !userRecord.googleRefreshToken) {
      return null;
    }

    const oauth2Client = createOAuth2Client();
    
    // Set credentials from stored tokens
    oauth2Client.setCredentials({
      access_token: userRecord.googleAccessToken,
      refresh_token: userRecord.googleRefreshToken,
      expiry_date: userRecord.googleTokenExpiry?.getTime() || undefined
    });

    // Check if token needs refreshing
    if (userRecord.googleTokenExpiry && userRecord.googleTokenExpiry < new Date()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Update tokens in database
        await db.update(users)
          .set({
            googleAccessToken: credentials.access_token,
            googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
          })
          .where(eq(users.id, userId));
        
        // Update client with new tokens
        oauth2Client.setCredentials(credentials);
      } catch (error) {
        console.error('Error refreshing Google token:', error);
        return null;
      }
    }

    // Create and return the calendar client
    return google.calendar({ version: 'v3', auth: oauth2Client });
  } catch (error) {
    console.error('Error getting Google Calendar client:', error);
    return null;
  }
}

/**
 * Sync a meeting to Google Calendar
 */
export async function syncMeetingToGoogle(
  userId: number, 
  meeting: {
    id: number;
    title: string;
    description: string | null;
    date: Date;
    participants: string[] | null;
    duration?: number;
    calendarEventId?: string | null;
  }
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const calendarClient = await getCalendarClient(userId);
  
  if (!calendarClient) {
    return { success: false, error: 'Google Calendar not connected' };
  }
  
  try {
    // Calculate end time (default to 1 hour if duration not specified)
    const startTime = new Date(meeting.date);
    const endTime = new Date(startTime.getTime() + (meeting.duration || 60) * 60000);
    
    // Format attendees
    const attendees = meeting.participants?.map(email => ({ email })) || [];
    
    // If meeting already has a calendar event ID, update it
    if (meeting.calendarEventId) {
      const event = await calendarClient.events.update({
        calendarId: 'primary',
        eventId: meeting.calendarEventId,
        requestBody: {
          summary: meeting.title,
          description: meeting.description || undefined,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          attendees: attendees.length > 0 ? attendees : undefined,
          source: {
            title: 'MeetMate',
            url: `${process.env.APP_URL || 'https://meetmate.replit.app'}/meeting-details/${meeting.id}`
          }
        }
      });
      
      return { success: true, eventId: event.data.id };
    } else {
      // Create a new event
      const event = await calendarClient.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: meeting.title,
          description: meeting.description || undefined,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          attendees: attendees.length > 0 ? attendees : undefined,
          source: {
            title: 'MeetMate',
            url: `${process.env.APP_URL || 'https://meetmate.replit.app'}/meeting-details/${meeting.id}`
          }
        }
      });
      
      return { success: true, eventId: event.data.id };
    }
  } catch (error: any) {
    console.error('Error syncing meeting to Google Calendar:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to sync with Google Calendar' 
    };
  }
}

/**
 * Delete a meeting from Google Calendar
 */
export async function deleteMeetingFromGoogle(
  userId: number, 
  calendarEventId: string
): Promise<{ success: boolean; error?: string }> {
  const calendarClient = await getCalendarClient(userId);
  
  if (!calendarClient) {
    return { success: false, error: 'Google Calendar not connected' };
  }
  
  try {
    await calendarClient.events.delete({
      calendarId: 'primary',
      eventId: calendarEventId
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting meeting from Google Calendar:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to delete event from Google Calendar' 
    };
  }
}

/**
 * Fetch user's Google Calendar events
 */
export async function fetchGoogleCalendarEvents(
  userId: number, 
  timeMin: Date, 
  timeMax: Date
): Promise<{ success: boolean; events?: any[]; error?: string }> {
  const calendarClient = await getCalendarClient(userId);
  
  if (!calendarClient) {
    return { success: false, error: 'Google Calendar not connected' };
  }
  
  try {
    const response = await calendarClient.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return { 
      success: true, 
      events: response.data.items || []
    };
  } catch (error: any) {
    console.error('Error fetching Google Calendar events:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch Google Calendar events' 
    };
  }
}

/**
 * Disconnect Google Calendar
 */
export async function disconnectGoogleCalendar(userId: number): Promise<{ success: boolean; message: string }> {
  try {
    await db.update(users)
      .set({
        googleRefreshToken: null,
        googleAccessToken: null,
        googleTokenExpiry: null,
        googleCalendarConnected: false,
        calendarProvider: null
      })
      .where(eq(users.id, userId));
    
    return { success: true, message: 'Google Calendar disconnected successfully' };
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    return { success: false, message: 'Failed to disconnect Google Calendar' };
  }
}