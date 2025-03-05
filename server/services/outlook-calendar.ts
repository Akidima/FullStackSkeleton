import { type Meeting } from "@shared/schema";
import axios from "axios";

const MICROSOFT_GRAPH_URL = "https://graph.microsoft.com/v1.0";

export class OutlookCalendarService {
  static async createCalendarEvent(meeting: Meeting, accessToken: string): Promise<string> {
    try {
      const response = await axios.post(
        `${MICROSOFT_GRAPH_URL}/me/events`,
        {
          subject: meeting.title,
          body: {
            contentType: "text",
            content: meeting.description || ""
          },
          start: {
            dateTime: new Date(meeting.date).toISOString(),
            timeZone: "UTC"
          },
          end: {
            dateTime: new Date(new Date(meeting.date).getTime() + 60 * 60 * 1000).toISOString(),
            timeZone: "UTC"
          },
          attendees: meeting.participants?.map(email => ({
            emailAddress: { address: email },
            type: "required"
          })) || []
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.id;
    } catch (error) {
      console.error('Error creating Outlook Calendar event:', error);
      throw new Error('Failed to create Outlook Calendar event');
    }
  }

  static async updateCalendarEvent(meeting: Meeting, eventId: string, accessToken: string): Promise<void> {
    try {
      await axios.patch(
        `${MICROSOFT_GRAPH_URL}/me/events/${eventId}`,
        {
          subject: meeting.title,
          body: {
            contentType: "text",
            content: meeting.description || ""
          },
          start: {
            dateTime: new Date(meeting.date).toISOString(),
            timeZone: "UTC"
          },
          end: {
            dateTime: new Date(new Date(meeting.date).getTime() + 60 * 60 * 1000).toISOString(),
            timeZone: "UTC"
          },
          attendees: meeting.participants?.map(email => ({
            emailAddress: { address: email },
            type: "required"
          })) || []
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error updating Outlook Calendar event:', error);
      throw new Error('Failed to update Outlook Calendar event');
    }
  }

  static async deleteCalendarEvent(eventId: string, accessToken: string): Promise<void> {
    try {
      await axios.delete(`${MICROSOFT_GRAPH_URL}/me/events/${eventId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
    } catch (error) {
      console.error('Error deleting Outlook Calendar event:', error);
      throw new Error('Failed to delete Outlook Calendar event');
    }
  }

  static async checkAvailability(startTime: Date, endTime: Date, accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${MICROSOFT_GRAPH_URL}/me/calendar/calendarView`,
        {
          params: {
            startDateTime: startTime.toISOString(),
            endDateTime: endTime.toISOString()
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.value.length === 0;
    } catch (error) {
      console.error('Error checking Outlook Calendar availability:', error);
      throw new Error('Failed to check calendar availability');
    }
  }
}
