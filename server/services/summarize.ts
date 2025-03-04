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
        followUpTasks: []
      };
    }

    // Generate main summary using BART
    const result = await model(textToSummarize, {
      max_length: 150,
      min_length: 40,
      temperature: 0.7,
    });

    // Extract key points from the notes
    const notes = meeting.notes || '';
    const decisions = notes.split('\n')
      .filter(line => line.toLowerCase().includes('decision:'))
      .map(line => line.replace(/^decision:/i, '').trim());

    const actions = notes.split('\n')
      .filter(line => line.toLowerCase().includes('action:'))
      .map(line => line.replace(/^action:/i, '').trim());

    const followUps = notes.split('\n')
      .filter(line => line.toLowerCase().includes('follow up:'))
      .map(line => line.replace(/^follow up:/i, '').trim());

    return {
      summary: result[0].summary_text,
      keyDecisions: decisions,
      actionItems: actions,
      followUpTasks: followUps
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
        followUpTasks: []
      };
    }
  }

  return summaries;
}