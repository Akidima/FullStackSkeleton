import Anthropic from '@anthropic-ai/sdk';
import { Meeting } from '@shared/schema';

// Initialize Claude AI client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Models
const CLAUDE_MODEL = 'claude-3-haiku-20240307'; // Using Haiku for cost-effectiveness
const CLAUDE_SONNET = 'claude-3-sonnet-20240229'; // Higher quality for important summaries

// Helper function to extract text content from Claude API response
function getTextFromClaudeResponse(response: any): string {
  if (response && response.content && response.content.length > 0) {
    const content = response.content[0];
    if (content && typeof content === 'object' && 'text' in content) {
      return content.text;
    }
  }
  console.warn('Unexpected content type in Claude response:', response);
  return '';
}

export class ClaudeAIService {
  /**
   * Generates a summary of a meeting based on notes, description, etc.
   */
  static async generateMeetingSummary(meeting: Meeting): Promise<string> {
    try {
      const { title, description, notes, participants } = meeting;
      
      const prompt = `
You are an expert meeting summarizer for the MeetMate platform. Please provide a concise and informative summary of the following meeting:

Title: ${title}
${description ? `Description: ${description}` : ''}
${participants ? `Participants: ${participants.join(', ')}` : ''}
${notes ? `Notes: ${notes}` : ''}

Generate a professional summary that captures the key points, action items, and any decisions made. Format the summary in a way that's easy to scan with bullet points for important items where appropriate.
`;

      const message = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        messages: [
          { role: 'user', content: prompt }
        ],
      });

      return getTextFromClaudeResponse(message);
    } catch (error) {
      console.error('Error generating meeting summary with Claude:', error);
      throw new Error('Failed to generate meeting summary');
    }
  }

  /**
   * Generates insights from a meeting
   */
  static async generateMeetingInsights(
    title: string, 
    description: string = '', 
    previousOutcomes: string[] = []
  ): Promise<Array<{
    insight: string;
    category: string;
    relevanceScore: number;
    source: string;
  }>> {
    try {
      const previousOutcomesText = previousOutcomes.length > 0 
        ? `Previous meeting outcomes:\n${previousOutcomes.join('\n')}`
        : '';
      
      const prompt = `
You are an assistant for the MeetMate app that helps users identify valuable insights from meetings.

Meeting Title: ${title}
${description ? `Meeting Description: ${description}` : ''}
${previousOutcomesText}

Based on the meeting information above, generate 3-5 business insights that would be valuable to the team.
For each insight, provide:
1. The insight itself - a clear, actionable statement
2. A category label (e.g., "Process Improvement", "Customer Feedback", "Team Collaboration", "Strategic Direction", "Resource Allocation")
3. A relevance score from 0.1-1.0 (where 1.0 is extremely relevant)

Format your response as a JSON array of objects with the properties: "insight", "category", and "relevanceScore".
Only respond with the JSON array, nothing else.
`;

      const message = await anthropic.messages.create({
        model: CLAUDE_SONNET, // Using Sonnet for higher quality insights
        max_tokens: 1500,
        messages: [
          { role: 'user', content: prompt }
        ],
        system: "You analyze meeting information to identify valuable business insights. You respond only with properly formatted JSON that matches the requested structure."
      });

      const response = getTextFromClaudeResponse(message).trim();
      let insights = [];
      
      try {
        insights = JSON.parse(response);
        // Add source to each insight
        insights = insights.map((insight: any) => ({
          ...insight,
          source: 'claude-ai'
        }));
      } catch (e) {
        console.error('Error parsing Claude insights response:', e);
        throw new Error('Failed to parse insights from Claude');
      }

      return insights;
    } catch (error) {
      console.error('Error generating meeting insights with Claude:', error);
      throw new Error('Failed to generate meeting insights');
    }
  }

  /**
   * Optimize meeting schedules and suggest improvements
   */
  static async generateOptimizationSuggestions(meetings: Meeting[]): Promise<string[]> {
    try {
      if (meetings.length === 0) {
        return ['No meetings found to analyze.'];
      }

      // Create a readable format of the meetings for Claude
      const meetingsData = meetings.map(m => {
        return `
Meeting: ${m.title}
Date: ${m.date.toISOString()}
Duration: ${(m as any).duration || 'Not specified'} minutes
Participants: ${m.participants ? m.participants.join(', ') : 'None specified'}
Description: ${m.description || 'None provided'}
Status: ${m.isCompleted ? 'Completed' : 'Scheduled'}
`;
      }).join('\n');

      const prompt = `
You are an expert meeting optimizer for MeetMate. Please analyze the following meeting data and provide 3-5 actionable suggestions to improve meeting efficiency, participant engagement, and overall productivity:

${meetingsData}

Consider factors like:
- Meeting frequency and duration patterns
- Participant overlap across meetings
- Potential for consolidating related meetings
- Optimal meeting times based on patterns
- Better distribution of meetings throughout the week
- Meeting types that could be converted to async communications

Provide your suggestions in a bulleted list format, with each suggestion being concise and actionable.
`;

      const message = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        messages: [
          { role: 'user', content: prompt }
        ],
      });

      // Extract bullet points from the response
      const responseText = getTextFromClaudeResponse(message);
      const suggestions = responseText
        .split('\n')
        .filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map((line: string) => line.replace(/^[-•]\s*/, '').trim());

      return suggestions.length > 0 ? suggestions : ['No optimization suggestions available at this time.'];
    } catch (error) {
      console.error('Error generating optimization suggestions with Claude:', error);
      throw new Error('Failed to generate optimization suggestions');
    }
  }

  /**
   * Generate agenda suggestions based on meeting title and description
   */
  static async generateAgendaSuggestions(
    title: string,
    description: string = '',
    duration: number = 60
  ): Promise<string[]> {
    try {
      const prompt = `
You are MeetMate's agenda assistant. Based on the following meeting information, suggest a structured agenda:

Meeting Title: ${title}
${description ? `Meeting Description: ${description}` : ''}
Expected Duration: ${duration} minutes

Create an agenda with appropriate time allocations for each item, considering:
- A brief introduction/welcome
- Main discussion topics based on the meeting title and description
- Time for questions and feedback
- Next steps and action items
- Closing remarks

Format your response as a JSON array of strings, where each string is an agenda item including its time allocation.
Only respond with the JSON array, nothing else.
`;

      const message = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        messages: [
          { role: 'user', content: prompt }
        ],
        system: "You create structured meeting agendas based on meeting information. You respond only with properly formatted JSON arrays of agenda items."
      });

      const response = getTextFromClaudeResponse(message).trim();
      let agendaItems = [];
      
      try {
        agendaItems = JSON.parse(response);
      } catch (e) {
        console.error('Error parsing Claude agenda response:', e);
        throw new Error('Failed to parse agenda from Claude');
      }

      return agendaItems;
    } catch (error) {
      console.error('Error generating agenda with Claude:', error);
      throw new Error('Failed to generate meeting agenda');
    }
  }

  /**
   * Analyze meeting notes to extract key discussion points, decisions, and action items
   */
  static async analyzeNotes(notes: string): Promise<{
    discussionPoints: string[];
    decisions: string[];
    actionItems: string[];
  }> {
    try {
      if (!notes || notes.trim() === '') {
        return {
          discussionPoints: [],
          decisions: [],
          actionItems: []
        };
      }

      const prompt = `
You are a meeting notes analyst for MeetMate. Please analyze the following meeting notes and extract:
1. Key discussion points
2. Decisions made
3. Action items (including who is responsible if mentioned)

Meeting Notes:
${notes}

Format your response as a JSON object with three properties: "discussionPoints", "decisions", and "actionItems", each containing an array of strings.
Only respond with the JSON object, nothing else.
`;

      const message = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1500,
        messages: [
          { role: 'user', content: prompt }
        ],
        system: "You analyze meeting notes to extract structured information. You respond only with properly formatted JSON that matches the requested structure."
      });

      const response = getTextFromClaudeResponse(message).trim();
      let result;
      
      try {
        result = JSON.parse(response);
      } catch (e) {
        console.error('Error parsing Claude notes analysis response:', e);
        throw new Error('Failed to parse notes analysis from Claude');
      }

      return {
        discussionPoints: result.discussionPoints || [],
        decisions: result.decisions || [],
        actionItems: result.actionItems || []
      };
    } catch (error) {
      console.error('Error analyzing notes with Claude:', error);
      throw new Error('Failed to analyze meeting notes');
    }
  }
}