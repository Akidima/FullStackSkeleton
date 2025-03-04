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
  keyDecisions: string[];
  actionItems: string[];
  followUpTasks: string[];
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
        keyDecisions: [],
        actionItems: [],
        followUpTasks: [],
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
    const decisions = notes.split('\n')
      .filter(line => /^(?:decision|decided|agreed):?/i.test(line))
      .map(line => line.replace(/^(?:decision|decided|agreed):?/i, '').trim());

    const actions = notes.split('\n')
      .filter(line => /^(?:action|task|todo):?/i.test(line))
      .map(line => line.replace(/^(?:action|task|todo):?/i, '').trim());

    const followUps = notes.split('\n')
      .filter(line => /^(?:follow[ -]?up|next[ -]?steps?):?/i.test(line))
      .map(line => line.replace(/^(?:follow[ -]?up|next[ -]?steps?):?/i, '').trim());

    // Simple sentiment analysis based on keywords
    const sentimentKeywords = {
      positive: ['agree', 'good', 'great', 'success', 'achieve', 'improve'],
      negative: ['disagree', 'bad', 'fail', 'issue', 'problem', 'concern']
    };

    const words = notes.toLowerCase().split(/\W+/);
    const positiveCount = words.filter(word => sentimentKeywords.positive.includes(word)).length;
    const negativeCount = words.filter(word => sentimentKeywords.negative.includes(word)).length;
    const totalSentimentWords = positiveCount + negativeCount;

    const sentimentScore = totalSentimentWords ? positiveCount / totalSentimentWords : 0.5;

    return {
      summary: summaryResult[0].summary_text,
      keyDecisions: decisions,
      actionItems: actions,
      followUpTasks: followUps,
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

export async function batchSummarize(meetings: Meeting[]): Promise<Record<number, MeetingSummaryDetails>> {
  const summaries: Record<number, MeetingSummaryDetails> = {};

  for (const meeting of meetings) {
    try {
      summaries[meeting.id] = await generateMeetingInsights(meeting);
    } catch (error) {
      console.error(`Failed to summarize meeting ${meeting.id}:`, error);
      summaries[meeting.id] = {
        summary: "Failed to generate summary.",
        keyDecisions: [],
        actionItems: [],
        followUpTasks: [],
        sentiment: {
          overall: 'neutral',
          score: 0.5
        }
      };
    }
  }

  return summaries;
}