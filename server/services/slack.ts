import { WebClient } from "@slack/web-api";
import type { Meeting } from "@shared/schema";

if (!process.env.SLACK_BOT_TOKEN) {
  throw new Error("SLACK_BOT_TOKEN environment variable must be set");
}

if (!process.env.SLACK_CHANNEL_ID) {
  throw new Error("SLACK_CHANNEL_ID environment variable must be set");
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const defaultChannel = process.env.SLACK_CHANNEL_ID;

export class SlackService {
  static async sendMeetingNotification(meeting: Meeting) {
    try {
      await slack.chat.postMessage({
        channel: defaultChannel,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "📅 New Meeting Scheduled",
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
    try {
      await slack.chat.postMessage({
        channel: defaultChannel,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "📝 Meeting Summary",
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
              text: `${statusEmoji[status]} Meeting ${status}: *${meeting.title}*`
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
