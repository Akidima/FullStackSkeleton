import { WebClient } from "@slack/web-api";
import type { Meeting } from "@shared/schema";

// Check if Slack integration is configured
const slackEnabled = process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID;

// Initialize Slack client only if configured
const slack = slackEnabled ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;

// Log Slack integration status
console.log(`Slack integration ${slackEnabled ? 'enabled' : 'disabled'}`);
const defaultChannel = process.env.SLACK_CHANNEL_ID || '';

export class SlackService {
  static async sendMeetingNotification(meeting: Meeting) {
    if (!slack) {
      console.log('Skipping Slack notification - Slack integration disabled');
      return;
    }

    try {
      await slack.chat.postMessage({
        channel: defaultChannel,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "📅 New MeetMate Meeting Scheduled",
              emoji: true
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Title:*\n${meeting.title}`
              },
              {
                type: "mrkdwn",
                text: `*Date:*\n${new Date(meeting.date).toLocaleString()}`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: meeting.description || "No description provided"
            }
          }
        ]
      });
    } catch (error) {
      console.error('Error sending Slack notification:', error);
      throw new Error('Failed to send Slack notification');
    }
  }

  static async sendMeetingSummary(meeting: Meeting, summary: string) {
    if (!slack) {
      console.log('Skipping meeting summary - Slack integration disabled');
      return;
    }

    try {
      await slack.chat.postMessage({
        channel: defaultChannel,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "📝 MeetMate Meeting Summary",
              emoji: true
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${meeting.title}*\n${new Date(meeting.date).toLocaleString()}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: summary
            }
          }
        ]
      });
    } catch (error) {
      console.error('Error sending meeting summary to Slack:', error);
      throw new Error('Failed to send meeting summary to Slack');
    }
  }

  static async updateMeetingStatus(meeting: Meeting, status: 'scheduled' | 'updated' | 'cancelled') {
    if (!slack) {
      console.log(`Skipping meeting status update - Slack integration disabled`);
      return;
    }

    const statusEmoji = {
      scheduled: '📅',
      updated: '🔄',
      cancelled: '❌'
    };

    try {
      await slack.chat.postMessage({
        channel: defaultChannel,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${statusEmoji[status]} MeetMate meeting ${status}: *${meeting.title}*`
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*When:*\n${new Date(meeting.date).toLocaleString()}`
              },
              {
                type: "mrkdwn",
                text: `*Status:*\n${status.charAt(0).toUpperCase() + status.slice(1)}`
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error('Error updating meeting status in Slack:', error);
      throw new Error('Failed to update meeting status in Slack');
    }
  }
}