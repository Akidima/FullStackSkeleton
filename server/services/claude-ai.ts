import Anthropic from '@anthropic-ai/sdk';
import { Meeting } from '@shared/schema';

// Initialize the Anthropic client with the API key
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Helper function to extract text content from Claude response
function extractTextFromResponse(response: any): string {
  if (!response || !response.content || !response.content[0]) {
    throw new Error('Invalid response: Missing content');
  }
  
  // Get the first content block
  const contentBlock = response.content[0];
  
  // Claude API returns content in the format: { type: 'text', text: 'content' }
  if (contentBlock && contentBlock.type === 'text') {
    return contentBlock.text;
  }
  
  throw new Error('Invalid response format: Expected text content');
}

/**
 * Generate meeting insights using Claude AI
 * @param meeting The meeting data to analyze
 * @returns AI-generated insights about the meeting
 */
export async function generateMeetingInsights(meeting: Meeting) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Analyze this meeting:
            Title: ${meeting.title}
            Description: ${meeting.description || 'N/A'}
            Agenda: ${meeting.agenda || 'N/A'}
            Notes: ${meeting.notes || 'N/A'}
            
            Provide the following:
            1. A brief summary of the meeting's purpose
            2. Key discussion points identified from the agenda and notes
            3. 2-3 action items that should be followed up on
            4. Suggestions for improving the meeting effectiveness
            
            Format the response as valid JSON with the following structure:
            {
              "summary": "string",
              "keyPoints": ["string", "string", ...],
              "actionItems": ["string", "string", ...],
              "suggestions": ["string", "string", ...]
            }
            
            Don't include any explanations, just return the JSON data.`
        }
      ],
      temperature: 0.3,
    });

    try {
      // Extract the JSON from the response
      const content = extractTextFromResponse(response);
      
      // Parse the JSON string into an object
      const insights = JSON.parse(content);
      return insights;
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError);
      throw new Error('Invalid response format from AI');
    }
  } catch (error) {
    console.error('Error generating meeting insights:', error);
    throw error;
  }
}

/**
 * Generate meeting optimization suggestions
 * @param meetings Array of meeting data to analyze
 * @returns AI-generated optimization suggestions
 */
export async function generateMeetingOptimizations(meetings: Meeting[]) {
  try {
    // Extract only the needed fields and add default duration if not present
    const meetingsData = meetings.map(m => ({
      id: m.id,
      title: m.title,
      date: m.date,
      // Add a default duration (60 minutes) since it's not in the schema
      estimatedDuration: 60, 
      participants: m.participants,
      isCompleted: m.isCompleted
    }));

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Analyze these meetings and suggest optimizations:
            ${JSON.stringify(meetingsData, null, 2)}
            
            Based on this meeting data, suggest:
            1. How to optimize the meeting schedule
            2. Which meetings could be combined
            3. Which meetings could be shortened
            4. Recommendations for better meeting efficiency
            
            Format the response as valid JSON with the following structure:
            {
              "scheduleSuggestions": ["string", "string", ...],
              "combinationSuggestions": [{"meetings": [number, number], "reason": "string"}, ...],
              "durationSuggestions": [{"meetingId": number, "suggestedDuration": number, "reason": "string"}, ...],
              "efficiencyTips": ["string", "string", ...]
            }
            
            Where "meetings" is an array of meeting IDs that could be combined.
            Don't include any explanations outside the JSON, just return the valid JSON data.`
        }
      ],
      temperature: 0.3,
    });

    try {
      // Extract the JSON from the response
      const content = extractTextFromResponse(response);
      
      // Parse the JSON string into an object
      const optimizations = JSON.parse(content);
      return optimizations;
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError);
      throw new Error('Invalid response format from AI');
    }
  } catch (error) {
    console.error('Error generating meeting optimizations:', error);
    throw error;
  }
}

/**
 * Generate summary notes for a meeting
 * @param meeting The meeting data to summarize
 * @returns AI-generated summary
 */
export async function generateMeetingSummary(meeting: Meeting) {
  if (!meeting.notes) {
    throw new Error('Meeting has no notes to summarize');
  }
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Summarize these meeting notes:
            Title: ${meeting.title}
            Description: ${meeting.description || 'N/A'}
            Agenda: ${meeting.agenda || 'N/A'}
            Notes: ${meeting.notes}
            
            Create a concise but comprehensive summary that captures:
            1. The main topics discussed
            2. Key decisions made
            3. Action items and who is responsible
            4. Any important deadlines mentioned
            
            Format the response as valid JSON with the following structure:
            {
              "summary": "string",
              "topics": ["string", "string", ...],
              "decisions": ["string", "string", ...],
              "actionItems": [{"task": "string", "assignee": "string"}, ...],
              "deadlines": [{"item": "string", "date": "string"}, ...]
            }
            
            Just return the JSON data, no additional text.`
        }
      ],
      temperature: 0.2,
    });

    try {
      // Extract the JSON from the response
      const content = extractTextFromResponse(response);
      
      // Parse the JSON string into an object
      const summary = JSON.parse(content);
      return summary;
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError);
      throw new Error('Invalid response format from AI');
    }
  } catch (error) {
    console.error('Error generating meeting summary:', error);
    throw error;
  }
}

/**
 * Process voice commands using Claude AI
 * @param command The voice command text
 * @param context Additional context data
 * @returns Structured response with action and parameters
 */
export async function processVoiceCommand(command: string, context: any = {}) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Process this voice command for a meeting management application:
            Command: "${command}"
            Context: ${JSON.stringify(context)}
            
            Valid command types include:
            - navigate (to a specific page like dashboard, meetings, tasks, settings)
            - create (a meeting, task, note)
            - search (for meetings or tasks)
            - filter (meetings or tasks by date, status, etc.)
            - control (voice assistant functions like pause, resume, stop)
            
            Format your response as valid JSON with this structure:
            {
              "understood": true/false,
              "commandType": "navigate|create|search|filter|control|unknown",
              "params": {
                // Parameters specific to the command type
              },
              "message": "Message to display to the user"
            }
            
            Just return the JSON, no additional text.`
        }
      ],
      temperature: 0.1,
    });

    try {
      // Extract the JSON from the response
      const content = extractTextFromResponse(response);
      
      // Parse the JSON string into an object
      const result = JSON.parse(content);
      return result;
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError);
      return {
        understood: false,
        commandType: 'unknown',
        params: {},
        message: 'Sorry, I had trouble understanding that command.'
      };
    }
  } catch (error) {
    console.error('Error processing voice command:', error);
    return {
      understood: false,
      commandType: 'unknown',
      params: {},
      message: 'An error occurred while processing your command.'
    };
  }
}