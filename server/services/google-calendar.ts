import { google } from 'googleapis';
import type { Meeting } from "@shared/schema";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Google Calendar credentials must be set in environment variables");
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.REPL_SLUG}.repl.co/auth/google/callback` // Replit domain
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

export class GoogleCalendarService {
  static async createCalendarEvent(meeting: Meeting, userToken: string): Promise<string> {
    try {
      oauth2Client.setCredentials({ access_token: userToken });

      const event = {
        summary: meeting.title,
        description: meeting.description,
        start: {
          dateTime: new Date(meeting.date).toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: new Date(new Date(meeting.date).getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
          timeZone: 'UTC',
        },
        attendees: meeting.participants?.map(email => ({ email })),
        reminders: {
          useDefault: true
        }
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all'
      });

      return response.data.id || '';
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw new Error('Failed to create Google Calendar event');
    }
  }

  static async updateCalendarEvent(meeting: Meeting, eventId: string, userToken: string): Promise<void> {
    try {
      oauth2Client.setCredentials({ access_token: userToken });

      const event = {
        summary: meeting.title,
        description: meeting.description,
        start: {
          dateTime: new Date(meeting.date).toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: new Date(new Date(meeting.date).getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: 'UTC',
        },
        attendees: meeting.participants?.map(email => ({ email }))
      };

      await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: event,
        sendUpdates: 'all'
      });
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      throw new Error('Failed to update Google Calendar event');
    }
  }

  static async deleteCalendarEvent(eventId: string, userToken: string): Promise<void> {
    try {
      oauth2Client.setCredentials({ access_token: userToken });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all'
      });
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      throw new Error('Failed to delete Google Calendar event');
    }
  }

  static async getAvailability(startTime: Date, endTime: Date, userToken: string): Promise<boolean> {
    try {
      oauth2Client.setCredentials({ access_token: userToken });

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: [{ id: 'primary' }]
        }
      });

      const busySlots = response.data.calendars?.primary?.busy || [];
      return busySlots.length === 0;
    } catch (error) {
      console.error('Error checking Google Calendar availability:', error);
      throw new Error('Failed to check calendar availability');
    }
  }
}
