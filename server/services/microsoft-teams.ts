import axios from 'axios';
import type { Meeting } from '@shared/schema';

export class MicrosoftTeamsService {
  static async sendMeetingNotification(meeting: Meeting, webhookUrl: string): Promise<void> {
    try {
      await axios.post(webhookUrl, {
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            body: [
              {
                type: 'TextBlock',
                size: 'medium',
                weight: 'bolder',
                text: '📅 New Meeting Scheduled'
              },
              {
                type: 'FactSet',
                facts: [
                  {
                    title: 'Title',
                    value: meeting.title
                  },
                  {
                    title: 'Date',
                    value: new Date(meeting.date).toLocaleString()
                  },
                  {
                    title: 'Description',
                    value: meeting.description || 'No description provided'
                  }
                ]
              }
            ],
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.2'
          }
        }]
      });
    } catch (error) {
      console.error('Error sending Teams notification:', error);
      throw new Error('Failed to send Teams notification');
    }
  }

  static async sendMeetingSummary(meeting: Meeting, summary: string, webhookUrl: string): Promise<void> {
    try {
      await axios.post(webhookUrl, {
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            body: [
              {
                type: 'TextBlock',
                size: 'medium',
                weight: 'bolder',
                text: '📝 Meeting Summary'
              },
              {
                type: 'TextBlock',
                text: meeting.title,
                weight: 'bolder'
              },
              {
                type: 'TextBlock',
                text: new Date(meeting.date).toLocaleString(),
                isSubtle: true
              },
              {
                type: 'TextBlock',
                text: summary,
                wrap: true
              }
            ],
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.2'
          }
        }]
      });
    } catch (error) {
      console.error('Error sending meeting summary to Teams:', error);
      throw new Error('Failed to send meeting summary to Teams');
    }
  }

  static async updateMeetingStatus(
    meeting: Meeting, 
    status: 'scheduled' | 'updated' | 'cancelled',
    webhookUrl: string
  ): Promise<void> {
    const statusEmoji = {
      scheduled: '📅',
      updated: '🔄',
      cancelled: '❌'
    };

    try {
      await axios.post(webhookUrl, {
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            body: [
              {
                type: 'TextBlock',
                size: 'medium',
                weight: 'bolder',
                text: `${statusEmoji[status]} Meeting ${status}: ${meeting.title}`
              },
              {
                type: 'FactSet',
                facts: [
                  {
                    title: 'When',
                    value: new Date(meeting.date).toLocaleString()
                  },
                  {
                    title: 'Status',
                    value: status.charAt(0).toUpperCase() + status.slice(1)
                  }
                ]
              }
            ],
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.2'
          }
        }]
      });
    } catch (error) {
      console.error('Error updating meeting status in Teams:', error);
      throw new Error('Failed to update meeting status in Teams');
    }
  }
}
