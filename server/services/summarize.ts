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

export async function generateMeetingInsights(meeting: Meeting): Promise<string> {
  try {
    const model = await initializeModel();
    
    // Combine relevant meeting text for summarization
    const textToSummarize = [
      meeting.description,
      meeting.agenda,
      meeting.notes
    ].filter(Boolean).join('\n\n');

    if (!textToSummarize) {
      return "No content available for summarization.";
    }

    // Generate summary using BART
    const result = await model(textToSummarize, {
      max_length: 150,
      min_length: 40,
      temperature: 0.7,
    });

    return result[0].summary_text;
  } catch (error) {
    console.error('Summarization error:', error);
    throw new Error('Failed to generate meeting insights');
  }
}

export async function batchSummarize(meetings: Meeting[]): Promise<Record<number, string>> {
  const summaries: Record<number, string> = {};
  
  for (const meeting of meetings) {
    if (!meeting.summary) {
      try {
        summaries[meeting.id] = await generateMeetingInsights(meeting);
      } catch (error) {
        console.error(`Failed to summarize meeting ${meeting.id}:`, error);
        summaries[meeting.id] = "Failed to generate summary.";
      }
    }
  }
  
  return summaries;
}
