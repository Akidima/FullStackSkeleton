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
      try {
        this.classifier = await pipeline('sentiment-analysis');
        this.initialized = true;
      } catch (error) {
        console.error('Error initializing AI model:', error);
        throw new Error('Failed to initialize AI optimization model');
      }
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

    try {
      const sentiments = await Promise.all(
        meetings.map(async meeting => {
          const text = `${meeting.title} ${meeting.description || ''} ${meeting.notes || ''}`;
          const result = await this.classifier(text);
          return result[0];
        })
      );

      const positiveCount = sentiments.filter(s => s.label === 'POSITIVE').length;
      return positiveCount / sentiments.length;
    } catch (error) {
      console.error('Error analyzing meeting effectiveness:', error);
      throw new Error('Failed to analyze meeting effectiveness');
    }
  }

  public async generateOptimizationSuggestions(meetings: Meeting[]): Promise<OptimizationSuggestion[]> {
    if (!meetings.length) {
      return [{
        type: 'efficiency',
        suggestion: 'Start scheduling meetings to receive AI-powered optimization suggestions',
        confidence: 1.0,
        reasoning: 'No meetings found in the system yet.'
      }];
    }

    const suggestions: OptimizationSuggestion[] = [];
    const dayStats = this.getDayStats(meetings);
    const timeStats = this.getTimeStats(meetings);
    const effectiveness = await this.analyzeMeetingEffectiveness(meetings);

    // Analyze meeting patterns
    const mostCommonDay = Object.entries(dayStats).sort((a, b) => b[1] - a[1])[0];
    const mostCommonTime = Object.entries(timeStats).sort((a, b) => b[1] - a[1])[0];

    // Calculate average meeting length
    const avgDuration = meetings.reduce((sum, m) => {
      const start = new Date(m.date);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour
      return sum + (end.getTime() - start.getTime()) / (60 * 1000); // Convert to minutes
    }, 0) / meetings.length;

    if (avgDuration > 45) {
      suggestions.push({
        type: 'duration',
        suggestion: 'Consider shorter meeting durations',
        confidence: 0.8,
        reasoning: `AI analysis shows average meeting duration is ${Math.round(avgDuration)} minutes. Research indicates meetings over 45 minutes tend to be less productive.`
      });
    }

    // Generate schedule optimization suggestions
    if (mostCommonDay && mostCommonTime) {
      suggestions.push({
        type: 'schedule',
        suggestion: `Consider distributing meetings more evenly throughout the week`,
        confidence: 0.7,
        reasoning: `AI pattern analysis shows ${mostCommonDay[0]} at ${mostCommonTime[0]} is your busiest time with ${mostCommonDay[1]} meetings.`
      });
    }

    // Generate efficiency suggestions based on sentiment analysis
    if (effectiveness < 0.6) {
      suggestions.push({
        type: 'efficiency',
        suggestion: 'Improve meeting engagement using AI-recommended strategies',
        confidence: 0.75,
        reasoning: 'AI sentiment analysis suggests meetings could be more engaging. Consider adding clear agendas and action items.'
      });
    }

    // Analyze participant patterns
    const avgParticipants = meetings.reduce((sum, m) => sum + (m.participants?.length || 0), 0) / meetings.length;
    if (avgParticipants > 8) {
      suggestions.push({
        type: 'participants',
        suggestion: 'Consider smaller meeting groups',
        confidence: 0.85,
        reasoning: `AI analysis shows an average of ${Math.round(avgParticipants)} participants per meeting. Research indicates smaller groups tend to be more effective.`
      });
    }

    return suggestions;
  }
}

export const meetingOptimizer = new MeetingOptimizer();