import { pipeline } from '@xenova/transformers';
import type { Meeting } from '@shared/schema';

let summarizationModel: any = null;

async function initializeModel() {
  if (!summarizationModel) {
    // Using BART for summarization as it's particularly good at this task
    summarizationModel = await pipeline('summarization', 'Xenova/bart-large-cnn');
  }
  return summarizationModel;
}

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
    const model = await initializeModel();

    // Combine relevant meeting text for summarization
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

    // Generate main summary using BART
    const summaryResult = await model(textToSummarize, {
      max_length: 150,
      min_length: 40,
      temperature: 0.7,
    });

    // Extract key points from the notes
    const notes = meeting.notes || '';

    // Enhanced key points extraction with better pattern matching
    const keyPoints = notes.split('\n')
      .filter(line => /^[•\-\*]\s/.test(line))
      .map(line => line.replace(/^[•\-\*]\s/, '').trim());

    const decisions = notes.split('\n')
      .filter(line => /^(?:decision|decided|agreed):?/i.test(line))
      .map(line => line.replace(/^(?:decision|decided|agreed):?/i, '').trim());

    const actionItems = notes.split('\n')
      .filter(line => /^(?:action|task|todo):?/i.test(line))
      .map(line => line.replace(/^(?:action|task|todo):?/i, '').trim());

    // Enhanced sentiment analysis based on keywords
    const sentimentKeywords = {
      positive: ['agree', 'good', 'great', 'success', 'achieve', 'improve', 'resolved', 'completed', 'progress'],
      negative: ['disagree', 'bad', 'fail', 'issue', 'problem', 'concern', 'delayed', 'blocked', 'risk']
    };

    const words = notes.toLowerCase().split(/\W+/);
    const positiveCount = words.filter(word => sentimentKeywords.positive.includes(word)).length;
    const negativeCount = words.filter(word => sentimentKeywords.negative.includes(word)).length;
    const totalSentimentWords = positiveCount + negativeCount;

    const sentimentScore = totalSentimentWords ? positiveCount / totalSentimentWords : 0.5;

    return {
      summary: summaryResult[0].summary_text,
      keyPoints,
      actionItems,
      decisions,
      sentiment: {
        overall: sentimentScore > 0.6 ? 'positive' : sentimentScore < 0.4 ? 'negative' : 'neutral',
        score: sentimentScore
      }
    };
  } catch (error) {
    console.error('Summarization error:', error);
    throw new Error('Failed to generate meeting insights');
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
        console.error(`Failed to summarize meeting ${meeting.id}:`, error);
        if (retries === MAX_RETRIES - 1) {
          summaries[meeting.id] = {
            summary: "Failed to generate summary.",
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