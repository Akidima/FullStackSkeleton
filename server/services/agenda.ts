import { Meeting } from '@shared/schema';
import { format } from 'date-fns';
import * as claudeAI from './claude-ai';

interface AgendaSuggestion {
  topics: string[];
  estimatedDuration: number;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

export class AgendaService {
  private static async prepareContextData(pastMeetings: Meeting[], upcomingTasks: any[]): Promise<string> {
    const meetingsContext = pastMeetings
      .map(m => `Meeting "${m.title}" on ${format(new Date(m.date), 'PPP')}: ${m.description || 'No description'}`)
      .join('\n');

    const tasksContext = upcomingTasks
      .map(t => `Task "${t.title}" due ${format(new Date(t.dueDate), 'PPP')}: ${t.description || 'No description'}`)
      .join('\n');

    return `Past Meetings:\n${meetingsContext}\n\nUpcoming Tasks:\n${tasksContext}`;
  }

  static async generateAgenda(
    meetingTitle: string,
    pastMeetings: Meeting[],
    upcomingTasks: any[],
    duration: number
  ): Promise<AgendaSuggestion> {
    try {
      const contextData = await this.prepareContextData(pastMeetings, upcomingTasks);
      
      // Use Claude AI to generate agenda suggestions
      const response = await claudeAI.generateMeetingInsights({
        title: meetingTitle,
        description: `Agenda for upcoming meeting. Context: ${contextData}`,
        agenda: "",
        notes: "",
        date: new Date(),
        id: 0,
        participants: [],
        isCompleted: false,
        userId: 0,
        roomId: 0,
        summary: null,
        calendarEventId: null,
        calendarSynced: false,
        lastSyncedAt: null
      });
      
      // Extract relevant information from Claude's response
      const topics = response.keyPoints || [];
      
      // Determine priority based on the content of the meeting
      let priority: 'high' | 'medium' | 'low' = 'medium';
      if (response.summary && response.summary.toLowerCase().includes('urgent')) {
        priority = 'high';
      } else if (response.summary && response.summary.toLowerCase().includes('optional')) {
        priority = 'low';
      }

      // Calculate estimated duration based on number of topics
      const estimatedDuration = Math.min(duration, topics.length * 15); // 15 minutes per topic by default

      return {
        topics,
        estimatedDuration,
        priority,
        notes: `Generated by Claude AI from analysis of ${pastMeetings.length} past meetings and ${upcomingTasks.length} upcoming tasks.`
      };
    } catch (error) {
      console.error('Error generating agenda with Claude AI:', error);
      throw new Error('Failed to generate agenda suggestions');
    }
  }

  static async summarizeMeeting(meetingNotes: string): Promise<string> {
    try {
      // Use Claude AI to generate a meeting summary
      const summary = await claudeAI.generateMeetingSummary({
        title: "Meeting Summary",
        description: "Notes to summarize",
        notes: meetingNotes,
        agenda: "",
        date: new Date(),
        id: 0,
        participants: [],
        isCompleted: true,
        userId: 0,
        roomId: 0,
        summary: null,
        calendarEventId: null,
        calendarSynced: false,
        lastSyncedAt: null
      });
      
      // Return the summary text
      return summary.summary;
    } catch (error) {
      console.error('Error summarizing meeting with Claude AI:', error);
      throw new Error('Failed to generate meeting summary');
    }
  }
}