import { Client } from '@microsoft/microsoft-graph-client';
// Mock AuthorizationCodeProvider since we don't have direct access to the actual provider
class AuthorizationCodeProvider {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private tokens: { accessToken: string; refreshToken: string };
  private authenticationProvider?: (callback: (error: Error | null, accessToken: string) => void) => void;

  constructor(options: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes?: string[];
    tokens?: { accessToken: string; refreshToken: string };
    authenticationProvider?: (callback: (error: Error | null, accessToken: string) => void) => void;
  }) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.redirectUri = options.redirectUri;
    this.tokens = options.tokens || { accessToken: '', refreshToken: '' };
    this.authenticationProvider = options.authenticationProvider;
  }

  getAccessToken(): Promise<string> {
    if (this.authenticationProvider) {
      return new Promise((resolve, reject) => {
        this.authenticationProvider!((error, token) => {
          if (error) {
            reject(error);
          } else {
            resolve(token);
          }
        });
      });
    }
    return Promise.resolve(this.tokens.accessToken);
  }
}
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Constants for Microsoft OAuth
const SCOPES = ['Calendars.ReadWrite', 'User.Read'];
const REDIRECT_URI = process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:5000/api/calendar/outlook/callback';
const AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

/**
 * Generate authentication URL for Outlook Calendar
 */
export function getAuthUrl(userId: number): string {
  const queryParams = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID || '',
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    response_mode: 'query',
    state: userId.toString()
  });
  
  return `${AUTH_URL}?${queryParams.toString()}`;
}

/**
 * Handle Outlook OAuth callback and store tokens
 */
export async function handleCallback(code: string, state: string): Promise<{ success: boolean; message: string }> {
  const userId = parseInt(state, 10);
  if (isNaN(userId)) {
    return { success: false, message: 'Invalid state parameter' };
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.OUTLOOK_CLIENT_ID || '',
        client_secret: process.env.OUTLOOK_CLIENT_SECRET || '',
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      }).toString()
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData.error_description || 'Failed to get tokens');
    }

    const tokens = await tokenResponse.json();
    
    // Store tokens in the database
    await db.update(users)
      .set({
        outlookRefreshToken: tokens.refresh_token,
        outlookAccessToken: tokens.access_token,
        outlookTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        outlookCalendarConnected: true,
        calendarProvider: 'outlook'
      })
      .where(eq(users.id, userId));
    
    return { success: true, message: 'Outlook Calendar connected successfully' };
  } catch (error) {
    console.error('Error getting Outlook tokens:', error);
    return { success: false, message: 'Failed to connect Outlook Calendar' };
  }
}

/**
 * Refresh Outlook access token
 */
async function refreshAccessToken(userId: number, refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDate: Date;
} | null> {
  try {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.OUTLOOK_CLIENT_ID || '',
        client_secret: process.env.OUTLOOK_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }).toString()
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData.error_description || 'Failed to refresh token');
    }

    const tokens = await tokenResponse.json();
    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);
    
    // Update tokens in database
    await db.update(users)
      .set({
        outlookAccessToken: tokens.access_token,
        outlookRefreshToken: tokens.refresh_token,
        outlookTokenExpiry: expiryDate
      })
      .where(eq(users.id, userId));
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate
    };
  } catch (error) {
    console.error('Error refreshing Outlook token:', error);
    return null;
  }
}

/**
 * Get authorized Microsoft Graph client for a user
 */
export async function getGraphClient(userId: number): Promise<Client | null> {
  try {
    // Get user's Outlook tokens
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        outlookAccessToken: true,
        outlookRefreshToken: true,
        outlookTokenExpiry: true,
        outlookCalendarConnected: true
      }
    });

    if (!userRecord || !userRecord.outlookCalendarConnected || !userRecord.outlookRefreshToken) {
      return null;
    }

    let accessToken = userRecord.outlookAccessToken;
    let refreshToken = userRecord.outlookRefreshToken;
    
    // Check if token needs refreshing
    if (userRecord.outlookTokenExpiry && userRecord.outlookTokenExpiry < new Date()) {
      const newTokens = await refreshAccessToken(userId, refreshToken);
      if (!newTokens) {
        return null;
      }
      
      accessToken = newTokens.accessToken;
      refreshToken = newTokens.refreshToken;
    }

    // Create authorization code provider
    const authProvider = new AuthorizationCodeProvider({
      clientId: process.env.OUTLOOK_CLIENT_ID || '',
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
      redirectUri: REDIRECT_URI,
      scopes: SCOPES,
      authenticationProvider: async (callback: (error: Error | null, accessToken: string) => void) => {
        callback(null, accessToken ?? '');
      }
    });

    // Create Microsoft Graph client
    return Client.initWithMiddleware({
      authProvider
    });
  } catch (error) {
    console.error('Error getting Microsoft Graph client:', error);
    return null;
  }
}

/**
 * Sync a meeting to Outlook Calendar
 */
export async function syncMeetingToOutlook(
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
  const graphClient = await getGraphClient(userId);
  
  if (!graphClient) {
    return { success: false, error: 'Outlook Calendar not connected' };
  }
  
  try {
    // Calculate end time (default to 1 hour if duration not specified)
    const startTime = new Date(meeting.date);
    const endTime = new Date(startTime.getTime() + (meeting.duration || 60) * 60000);
    
    // Format attendees
    const attendees = meeting.participants?.map(email => ({
      emailAddress: {
        address: email
      },
      type: 'required'
    })) || [];
    
    // Event object for Graph API
    const eventObject = {
      subject: meeting.title,
      body: {
        contentType: 'text',
        content: meeting.description || 'Meeting scheduled via MeetMate'
      },
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      attendees: attendees,
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness'
    };
    
    // If meeting already has a calendar event ID, update it
    if (meeting.calendarEventId) {
      await graphClient
        .api(`/me/events/${meeting.calendarEventId}`)
        .update(eventObject);
      
      return { success: true, eventId: meeting.calendarEventId };
    } else {
      // Create a new event
      const response = await graphClient
        .api('/me/events')
        .post(eventObject);
      
      return { success: true, eventId: response.id };
    }
  } catch (error: any) {
    console.error('Error syncing meeting to Outlook Calendar:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to sync with Outlook Calendar' 
    };
  }
}

/**
 * Delete a meeting from Outlook Calendar
 */
export async function deleteMeetingFromOutlook(
  userId: number, 
  calendarEventId: string
): Promise<{ success: boolean; error?: string }> {
  const graphClient = await getGraphClient(userId);
  
  if (!graphClient) {
    return { success: false, error: 'Outlook Calendar not connected' };
  }
  
  try {
    await graphClient
      .api(`/me/events/${calendarEventId}`)
      .delete();
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting meeting from Outlook Calendar:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to delete event from Outlook Calendar' 
    };
  }
}

/**
 * Fetch user's Outlook Calendar events
 */
export async function fetchOutlookCalendarEvents(
  userId: number, 
  timeMin: Date, 
  timeMax: Date
): Promise<{ success: boolean; events?: any[]; error?: string }> {
  const graphClient = await getGraphClient(userId);
  
  if (!graphClient) {
    return { success: false, error: 'Outlook Calendar not connected' };
  }
  
  try {
    const response = await graphClient
      .api('/me/events')
      .filter(`start/dateTime ge '${timeMin.toISOString()}' and end/dateTime le '${timeMax.toISOString()}'`)
      .select('id,subject,bodyPreview,start,end,attendees,organizer,isOnlineMeeting,onlineMeeting')
      .orderby('start/dateTime')
      .get();
    
    return { 
      success: true, 
      events: response.value || []
    };
  } catch (error: any) {
    console.error('Error fetching Outlook Calendar events:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch Outlook Calendar events' 
    };
  }
}

/**
 * Disconnect Outlook Calendar
 */
export async function disconnectOutlookCalendar(userId: number): Promise<{ success: boolean; message: string }> {
  try {
    await db.update(users)
      .set({
        outlookRefreshToken: null,
        outlookAccessToken: null,
        outlookTokenExpiry: null,
        outlookCalendarConnected: false,
        calendarProvider: null
      })
      .where(eq(users.id, userId));
    
    return { success: true, message: 'Outlook Calendar disconnected successfully' };
  } catch (error) {
    console.error('Error disconnecting Outlook Calendar:', error);
    return { success: false, message: 'Failed to disconnect Outlook Calendar' };
  }
}