import type { Meeting } from '@shared/schema';
import * as claudeAI from './claude-ai';

interface MeetingSummaryDetails {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    score: number;
  };
}

export async function generateMeetingInsights(meeting: Meeting): Promise<MeetingSummaryDetails> {
  try {
    const textToSummarize = [
      meeting.description,
      meeting.agenda,
      meeting.notes
    ].filter(Boolean).join('\n\n');

    if (!textToSummarize) {
      return {
        summary: "No content available for summarization.",
        keyPoints: [],
        actionItems: [],
        decisions: [],
        sentiment: {
          overall: 'neutral',
          score: 0.5
        }
      };
    }

    // Use Claude AI to generate insights
    const claudeResponse = await claudeAI.generateMeetingInsights(meeting);
    
    // Process sentiment
    let sentimentOverall: 'positive' | 'neutral' | 'negative' = 'neutral';
    let sentimentScore = 0.5;
    
    // Calculate sentiment based on the content of suggestions
    if (claudeResponse.suggestions) {
      const suggestionText = claudeResponse.suggestions.join(' ').toLowerCase();
      const positiveTerms = ['improve', 'good', 'effective', 'productive', 'successful'];
      const negativeTerms = ['issue', 'problem', 'concern', 'ineffective', 'inefficient'];
      
      let positiveMatches = 0;
      let negativeMatches = 0;
      
      positiveTerms.forEach(term => {
        if (suggestionText.includes(term)) positiveMatches++;
      });
      
      negativeTerms.forEach(term => {
        if (suggestionText.includes(term)) negativeMatches++;
      });
      
      const totalMatches = positiveMatches + negativeMatches;
      if (totalMatches > 0) {
        sentimentScore = positiveMatches / totalMatches;
        sentimentOverall = sentimentScore > 0.6 ? 'positive' : sentimentScore < 0.4 ? 'negative' : 'neutral';
      }
    }
    
    // Extract actionItems - convert array of objects to array of strings if needed
    let actionItems: string[] = [];
    if (claudeResponse.actionItems) {
      if (Array.isArray(claudeResponse.actionItems)) {
        if (typeof claudeResponse.actionItems[0] === 'string') {
          actionItems = claudeResponse.actionItems as string[];
        } else if (typeof claudeResponse.actionItems[0] === 'object') {
          // Handle object format from Claude's JSON response
          actionItems = (claudeResponse.actionItems as any[]).map(item => {
            if (item.task) return `${item.task}${item.assignee ? ' - ' + item.assignee : ''}`;
            return JSON.stringify(item);
          });
        }
      }
    }
    
    // Extract decisions
    let decisions: string[] = claudeResponse.decisions || [];
    
    return {
      summary: claudeResponse.summary,
      keyPoints: claudeResponse.keyPoints || [],
      actionItems,
      decisions,
      sentiment: {
        overall: sentimentOverall,
        score: sentimentScore
      }
    };
  } catch (error) {
    console.error('MeetMate summarization error with Claude:', error);
    throw new Error('Failed to generate meeting insights with Claude AI');
  }
}

// Rate limiting configuration
const RETRY_DELAY = 1000; // Start with 1 second
const MAX_RETRIES = 3;

export async function batchSummarize(meetings: Meeting[]): Promise<Record<number, MeetingSummaryDetails>> {
  const summaries: Record<number, MeetingSummaryDetails> = {};

  for (const meeting of meetings) {
    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        summaries[meeting.id] = await generateMeetingInsights(meeting);
        break;
      } catch (error) {
        console.error(`Failed to summarize MeetMate meeting ${meeting.id} with Claude AI:`, error);
        if (retries === MAX_RETRIES - 1) {
          summaries[meeting.id] = {
            summary: "Failed to generate summary with Claude AI.",
            keyPoints: [],
            actionItems: [],
            decisions: [],
            sentiment: {
              overall: 'neutral',
              score: 0.5
            }
          };
        }
        const delay = RETRY_DELAY * Math.pow(2, retries);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
      }
    }
  }

  return summaries;
}