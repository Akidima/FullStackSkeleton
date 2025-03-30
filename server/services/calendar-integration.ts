import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as googleCalendar from './google-calendar';
import * as outlookCalendar from './outlook-calendar';

export type CalendarProvider = 'google' | 'outlook' | null;

/**
 * Get the user's connected calendar provider
 */
export async function getUserCalendarProvider(userId: number): Promise<CalendarProvider> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      calendarProvider: true
    }
  });
  
  return user?.calendarProvider as CalendarProvider;
}

/**
 * Get authentication URL for connecting a calendar provider
 */
export function getAuthUrl(provider: string, userId: number): string {
  switch (provider) {
    case 'google':
      return googleCalendar.getAuthUrl(userId);
    case 'outlook':
      return outlookCalendar.getAuthUrl(userId);
    default:
      throw new Error(`Unsupported calendar provider: ${provider}`);
  }
}

/**
 * Sync a meeting to the user's connected calendar
 */
export async function syncMeetingToCalendar(
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
): Promise<{ success: boolean; eventId?: string; error?: string; provider?: CalendarProvider }> {
  const provider = await getUserCalendarProvider(userId);
  
  if (!provider) {
    return { success: false, error: 'No calendar provider connected' };
  }
  
  switch (provider) {
    case 'google': {
      const result = await googleCalendar.syncMeetingToGoogle(userId, meeting);
      return { ...result, provider: 'google' };
    }
    case 'outlook': {
      const result = await outlookCalendar.syncMeetingToOutlook(userId, meeting);
      return { ...result, provider: 'outlook' };
    }
    default:
      return { success: false, error: `Unsupported calendar provider: ${provider}` };
  }
}

/**
 * Delete a meeting from the user's connected calendar
 */
export async function deleteMeetingFromCalendar(
  userId: number,
  calendarEventId: string
): Promise<{ success: boolean; error?: string; provider?: CalendarProvider }> {
  const provider = await getUserCalendarProvider(userId);
  
  if (!provider) {
    return { success: false, error: 'No calendar provider connected' };
  }
  
  switch (provider) {
    case 'google': {
      const result = await googleCalendar.deleteMeetingFromGoogle(userId, calendarEventId);
      return { ...result, provider: 'google' };
    }
    case 'outlook': {
      const result = await outlookCalendar.deleteMeetingFromOutlook(userId, calendarEventId);
      return { ...result, provider: 'outlook' };
    }
    default:
      return { success: false, error: `Unsupported calendar provider: ${provider}` };
  }
}

/**
 * Fetch events from the user's connected calendar
 */
export async function fetchCalendarEvents(
  userId: number,
  timeMin: Date,
  timeMax: Date
): Promise<{ success: boolean; events?: any[]; error?: string; provider?: CalendarProvider }> {
  const provider = await getUserCalendarProvider(userId);
  
  if (!provider) {
    return { success: false, error: 'No calendar provider connected' };
  }
  
  switch (provider) {
    case 'google': {
      const result = await googleCalendar.fetchGoogleCalendarEvents(userId, timeMin, timeMax);
      return { ...result, provider: 'google' };
    }
    case 'outlook': {
      const result = await outlookCalendar.fetchOutlookCalendarEvents(userId, timeMin, timeMax);
      return { ...result, provider: 'outlook' };
    }
    default:
      return { success: false, error: `Unsupported calendar provider: ${provider}` };
  }
}

/**
 * Disconnect the user's calendar provider
 */
export async function disconnectCalendar(userId: number): Promise<{ success: boolean; message: string }> {
  const provider = await getUserCalendarProvider(userId);
  
  if (!provider) {
    return { success: false, message: 'No calendar provider connected' };
  }
  
  switch (provider) {
    case 'google':
      return googleCalendar.disconnectGoogleCalendar(userId);
    case 'outlook':
      return outlookCalendar.disconnectOutlookCalendar(userId);
    default:
      return { success: false, message: `Unsupported calendar provider: ${provider}` };
  }
}

/**
 * Check if a user has a connected calendar
 */
export async function hasConnectedCalendar(userId: number): Promise<boolean> {
  const provider = await getUserCalendarProvider(userId);
  return provider !== null;
}

/**
 * Get calendar connection status for a user
 */
export async function getCalendarConnectionStatus(userId: number): Promise<{
  connected: boolean;
  provider: CalendarProvider;
}> {
  const provider = await getUserCalendarProvider(userId);
  return {
    connected: provider !== null,
    provider
  };
}