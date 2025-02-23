import { Meeting } from '@shared/schema';
import { pipeline } from '@xenova/transformers';

interface AgendaSuggestion {
  topics: string[];
  estimatedDuration: number;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

export class AgendaService {
  private static summarizer: any = null;
  private static classifier: any = null;

  private static async initModels() {
    if (!this.summarizer) {
      this.summarizer = await pipeline('summarization', 'Xenova/bart-large-cnn');
    }
    if (!this.classifier) {
      this.classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    }
  }

  private static async analyzeContext(pastMeetings: Meeting[], upcomingTasks: any[]): Promise<string> {
    const meetingsContext = pastMeetings
      .map(m => `Meeting "${m.title}" on ${m.date}: ${m.description}`)
      .join('\n');

    const tasksContext = upcomingTasks
      .map(t => `Task "${t.title}" due ${t.dueDate}: ${t.description}`)
      .join('\n');

    const fullContext = `Past Meetings:\n${meetingsContext}\n\nUpcoming Tasks:\n${tasksContext}`;

    await this.initModels();
    const summary = await this.summarizer(fullContext, {
      max_length: 130,
      min_length: 30,
      do_sample: false
    });

    return summary[0].summary_text;
  }

  static async generateAgenda(
    meetingTitle: string,
    pastMeetings: Meeting[],
    upcomingTasks: any[],
    duration: number
  ): Promise<AgendaSuggestion> {
    try {
      const contextSummary = await this.analyzeContext(pastMeetings, upcomingTasks);

      // Extract potential topics from the summary
      const topics = contextSummary
        .split('.')
        .filter(sentence => sentence.trim().length > 0)
        .map(sentence => sentence.trim())
        .slice(0, 5); // Limit to 5 main topics

      // Determine priority based on sentiment analysis
      await this.initModels();
      const sentiment = await this.classifier(contextSummary);
      const priority = sentiment[0].label === 'POSITIVE' ? 'medium' : 'high';

      // Calculate estimated duration per topic
      const estimatedDuration = Math.min(duration, topics.length * 15); // 15 minutes per topic by default

      return {
        topics,
        estimatedDuration,
        priority,
        notes: `Generated from analysis of ${pastMeetings.length} past meetings and ${upcomingTasks.length} upcoming tasks.`
      };
    } catch (error) {
      console.error('Error generating agenda:', error);
      throw new Error('Failed to generate agenda suggestions');
    }
  }

  static async summarizeMeeting(meetingNotes: string): Promise<string> {
    try {
      await this.initModels();
      const summary = await this.summarizer(meetingNotes, {
        max_length: 130,
        min_length: 30,
        do_sample: false
      });

      return summary[0].summary_text;
    } catch (error) {
      console.error('Error summarizing meeting:', error);
      throw new Error('Failed to generate meeting summary');
    }
  }
}