import { pipeline } from '@xenova/transformers';
import { Meeting } from '@shared/schema';
import { format } from 'date-fns';

interface OptimizationSuggestion {
  type: 'duration' | 'schedule' | 'participants' | 'efficiency';
  suggestion: string;
  confidence: number;
  reasoning: string;
}

export class MeetingOptimizer {
  private classifier: any;
  private initialized: boolean = false;

  private async initialize() {
    if (!this.initialized) {
      this.classifier = await pipeline('sentiment-analysis');
      this.initialized = true;
    }
  }

  private getDayStats(meetings: Meeting[]): Record<string, number> {
    return meetings.reduce((acc: Record<string, number>, meeting) => {
      const day = format(new Date(meeting.date), 'EEEE');
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});
  }

  private getTimeStats(meetings: Meeting[]): Record<string, number> {
    return meetings.reduce((acc: Record<string, number>, meeting) => {
      const hour = format(new Date(meeting.date), 'HH:00');
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});
  }

  private async analyzeMeetingEffectiveness(meetings: Meeting[]): Promise<number> {
    await this.initialize();

    const sentiments = await Promise.all(
      meetings.map(async meeting => {
        const text = `${meeting.title} ${meeting.description || ''} ${meeting.notes || ''}`;
        const result = await this.classifier(text);
        return result[0];
      })
    );

    const positiveCount = sentiments.filter(s => s.label === 'POSITIVE').length;
    return positiveCount / sentiments.length;
  }

  public async generateOptimizationSuggestions(meetings: Meeting[]): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    const dayStats = this.getDayStats(meetings);
    const timeStats = this.getTimeStats(meetings);
    const effectiveness = await this.analyzeMeetingEffectiveness(meetings);

    // Analyze meeting patterns
    const mostCommonDay = Object.entries(dayStats).sort((a, b) => b[1] - a[1])[0];
    const mostCommonTime = Object.entries(timeStats).sort((a, b) => b[1] - a[1])[0];

    // Calculate average meeting length (end time - start time)
    const avgDuration = meetings.reduce((sum, m) => {
      const start = new Date(m.date);
      const end = m.endDate ? new Date(m.endDate) : new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour if no end date
      return sum + (end.getTime() - start.getTime()) / (60 * 1000); // Convert to minutes
    }, 0) / meetings.length;

    if (avgDuration > 45) {
      suggestions.push({
        type: 'duration',
        suggestion: 'Consider shorter meeting durations',
        confidence: 0.8,
        reasoning: `Average meeting duration is ${Math.round(avgDuration)} minutes. Research shows meetings over 45 minutes tend to be less productive.`
      });
    }

    // Generate schedule optimization suggestions
    if (mostCommonDay && mostCommonTime) {
      suggestions.push({
        type: 'schedule',
        suggestion: `Consider distributing meetings more evenly throughout the week`,
        confidence: 0.7,
        reasoning: `${mostCommonDay[0]} at ${mostCommonTime[0]} is your busiest time with ${mostCommonDay[1]} meetings.`
      });
    }

    // Generate efficiency suggestions based on sentiment analysis
    if (effectiveness < 0.6) {
      suggestions.push({
        type: 'efficiency',
        suggestion: 'Consider improving meeting engagement',
        confidence: 0.75,
        reasoning: 'Analysis suggests meetings could be more engaging. Consider adding clear agendas and action items.'
      });
    }

    // Analyze participant patterns
    const avgParticipants = meetings.reduce((sum, m) => sum + (m.participants?.length || 0), 0) / meetings.length;
    if (avgParticipants > 8) {
      suggestions.push({
        type: 'participants',
        suggestion: 'Consider smaller meeting groups',
        confidence: 0.85,
        reasoning: `Average of ${Math.round(avgParticipants)} participants per meeting. Smaller groups tend to be more effective.`
      });
    }

    return suggestions;
  }
}

export const meetingOptimizer = new MeetingOptimizer();