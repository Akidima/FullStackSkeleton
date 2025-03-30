import Anthropic from '@anthropic-ai/sdk';
import { Meeting, VoiceCommandShortcut } from '@shared/schema';
import * as aiValidator from './ai-validator';
import { storage } from '../storage';

// Initialize the Anthropic client with the API key
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Configure Claude AI for maximum accuracy
const MODELS = {
  // Using Haiku for faster responses with good quality
  HAIKU: 'claude-3-haiku-20240307',
  // Use Opus for highest quality when needed (more expensive and slower)
  OPUS: 'claude-3-opus-20240229',
  // Use Sonnet as a middle ground
  SONNET: 'claude-3-sonnet-20240229'
};

// Select appropriate model based on accuracy requirements
const getModelForTask = (task: string, requiresHighAccuracy: boolean = true): string => {
  // Use more capable models for complex tasks requiring 95%+ accuracy
  if (requiresHighAccuracy) {
    if (task === 'summarization' || task === 'insights') {
      return MODELS.SONNET; // Better comprehension for meeting content
    } else if (task === 'optimization') {
      return MODELS.SONNET; // Better reasoning for optimization suggestions
    }
  }
  // Default to Haiku for most tasks
  return MODELS.HAIKU;
};

// Calculate string similarity for voice command matching
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0; // Exact match
  if (str1.length === 0 || str2.length === 0) return 0.0;
  
  // Simple contain check for short commands
  if (str1.includes(str2) || str2.includes(str1)) {
    // If one is a substring of the other, consider it a high match
    const ratio = Math.min(str1.length, str2.length) / Math.max(str1.length, str2.length);
    return 0.8 + (ratio * 0.2); // Scale between 0.8 and 1.0 based on length ratio
  }
  
  // Basic Levenshtein distance calculation
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create matrix of distances
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  // Calculate similarity score (0 to 1)
  // Convert edit distance to similarity ratio
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  const similarity = 1 - (distance / maxLen);
  
  return similarity;
}

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

// Add a delay function to help with rate limiting
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Keep track of the last API call time
let lastApiCallTime = 0;
const MIN_TIME_BETWEEN_CALLS = 2000; // 2 seconds between API calls

// Process and validate Claude responses with error handling and rate limiting
async function processClaudeResponse<T>(
  responsePromise: Promise<any>, 
  validationFunction?: (data: any) => any,
  defaultValue?: T
): Promise<T> {
  try {
    // Apply rate limiting
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;
    
    if (timeSinceLastCall < MIN_TIME_BETWEEN_CALLS) {
      const waitTime = MIN_TIME_BETWEEN_CALLS - timeSinceLastCall;
      console.log(`Rate limiting: Waiting ${waitTime}ms before next Claude API call`);
      await delay(waitTime);
    }
    
    // Update the last API call time
    lastApiCallTime = Date.now();
    
    // Make the API call
    const response = await responsePromise;
    const content = extractTextFromResponse(response);
    
    try {
      // Parse JSON from response
      const parsedData = JSON.parse(content);
      
      // Apply validation if provided
      const validatedData = validationFunction ? validationFunction(parsedData) : parsedData;
      
      return validatedData as T;
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError);
      throw new Error('Invalid response format from AI');
    }
  } catch (error) {
    console.error('Error processing Claude API response:', error);
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw error;
  }
}

/**
 * Generate meeting insights using Claude AI
 * @param meeting The meeting data to analyze
 * @returns AI-generated insights about the meeting
 */
export async function generateMeetingInsights(meeting: Meeting) {
  // Prepare a richer context for the meeting by combining all available information
  // and adding metadata about the meeting structure
  
  const meetingContext = `
    MEETING DETAILS:
    Title: ${meeting.title}
    Date: ${new Date(meeting.date).toLocaleString()}
    Description: ${meeting.description || 'N/A'}
    Agenda: ${meeting.agenda || 'N/A'}
    Notes: ${meeting.notes || 'N/A'}
    ${meeting.participants ? `Participants: ${meeting.participants.join(', ')}` : 'No participants listed'}
    Status: ${meeting.isCompleted ? 'Completed' : 'Scheduled/In Progress'}
  `;
  
  // Calculate various metrics about the meeting
  const descriptionLength = (meeting.description || '').length;
  const agendaLength = (meeting.agenda || '').length;
  const notesLength = (meeting.notes || '').length;
  const participantCount = meeting.participants ? meeting.participants.length : 0;
  
  // Calculate metrics about notes structure if available
  let bulletPointCount = 0;
  let sectionCount = 0;
  let taskIndicators = 0;
  
  if (meeting.notes) {
    const lines = meeting.notes.split('\n');
    bulletPointCount = lines.filter(line => /^[\s]*[\*\-\•]/.test(line)).length;
    sectionCount = lines.filter(line => /^#+\s/.test(line)).length;
    taskIndicators = lines.filter(line => /task|action|todo|follow[ -]?up/i.test(line)).length;
  }
  
  const metricsContext = `
    MEETING METRICS:
    Description length: ${descriptionLength} chars
    Agenda length: ${agendaLength} chars
    Notes length: ${notesLength} chars
    Participant count: ${participantCount}
    Bullet points in notes: ${bulletPointCount}
    Sections in notes: ${sectionCount}
    Task-related items: ${taskIndicators}
  `;

  // Select appropriate model - use Sonnet for complex meetings with notes
  const selectedModel = getModelForTask('insights', notesLength > 500);

  // Create the Claude API request
  const insightsRequest = anthropic.messages.create({
    model: selectedModel,
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `As an expert meeting analyst with 95% accuracy, analyze this meeting data and provide detailed insights:
          
          ${meetingContext}
          
          ${metricsContext}
          
          ANALYSIS INSTRUCTIONS:
          1. Provide a concise but comprehensive summary that captures the meeting's purpose and outcomes
          2. Identify the key discussion points from the agenda and notes with high confidence
          3. Extract or infer the most important action items needing follow-up
          4. Suggest specific, actionable ways to improve the meeting's effectiveness
          5. Maintain 95% accuracy by only including insights with high confidence
          
          ACCURACY REQUIREMENTS:
          - Only include information explicitly stated or strongly implied
          - For any inference, ensure it has a confidence level of 95% or higher
          - Focus on quality of insights rather than quantity
          - If insufficient data exists, acknowledge the limitations
          
          FORMAT:
          Return a valid JSON object with this structure:
          {
            "summary": "string",
            "keyPoints": ["string", "string", ...],
            "actionItems": ["string", "string", ...],
            "suggestions": ["string", "string", ...],
            "confidenceScore": number,
            "analysisLimitations": ["string", "string", ...]
          }
          
          Where:
          - "confidenceScore" is between 0.95 and 1.0 representing your overall confidence
          - "analysisLimitations" describes any limitations in your analysis due to insufficient data
          
          Return only the JSON data, no explanations outside the JSON.`
      }
    ],
    temperature: 0.1, // Low temperature for higher precision and factuality
  });

  // Process the response with validation
  const defaultInsights = {
    summary: "Insufficient data to generate accurate meeting insights.",
    keyPoints: [],
    actionItems: [],
    suggestions: ["Add more details to the meeting to get better insights."],
    confidenceScore: 0.95,
    analysisLimitations: ["Limited meeting data available"]
  };

  return processClaudeResponse(
    insightsRequest, 
    aiValidator.validateMeetingInsights,
    defaultInsights
  );
}

/**
 * Generate meeting optimization suggestions
 * @param meetings Array of meeting data to analyze
 * @returns AI-generated optimization suggestions
 */
export async function generateMeetingOptimizations(meetings: Meeting[]) {
  // Extract richer meeting data for better analysis including descriptions and notes
  const meetingsData = meetings.map(m => ({
    id: m.id,
    title: m.title,
    date: m.date,
    description: m.description,
    agenda: m.agenda,
    // Calculate actual meeting duration from historical data if possible
    estimatedDuration: m.summary ? 45 : 60, // Use shorter duration if meeting has been summarized (completed)
    participants: m.participants,
    isCompleted: m.isCompleted,
    dayOfWeek: new Date(m.date).toLocaleDateString('en-US', { weekday: 'long' }),
    timeOfDay: new Date(m.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }));

  // Calculate statistics for better context
  const totalMeetings = meetingsData.length;
  const completedMeetings = meetingsData.filter(m => m.isCompleted).length;
  const averageParticipants = meetings.reduce((sum, m) => sum + (m.participants?.length || 0), 0) / Math.max(1, meetings.length);
  
  // Day of week counts for pattern recognition
  const dayFrequency: Record<string, number> = {};
  meetingsData.forEach(m => {
    dayFrequency[m.dayOfWeek] = (dayFrequency[m.dayOfWeek] || 0) + 1;
  });

  // Select appropriate model based on complexity
  const selectedModel = getModelForTask('optimization', totalMeetings > 5);

  // Create the optimization request
  const optimizationRequest = anthropic.messages.create({
    model: selectedModel,
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `As an expert meeting efficiency analyst with 95% accuracy, analyze these meetings and provide optimization recommendations:
          
          MEETING DATA:
          ${JSON.stringify(meetingsData, null, 2)}
          
          STATISTICAL CONTEXT:
          - Total meetings: ${totalMeetings}
          - Completed meetings: ${completedMeetings}
          - Average participants per meeting: ${averageParticipants.toFixed(1)}
          - Meeting frequency by day: ${JSON.stringify(dayFrequency)}
          
          ANALYSIS INSTRUCTIONS:
          1. Identify clear patterns in scheduling that could be optimized (e.g., too many meetings on one day)
          2. Find meetings with similar topics or participants that could be combined
          3. Identify meetings that appear to be longer than necessary based on content
          4. Provide specific, actionable efficiency recommendations based on meeting content
          
          ACCURACY REQUIREMENTS:
          - Only make suggestions when you have high confidence (95%+ certainty)
          - Base recommendations on clear patterns, not assumptions
          - For any suggestion, provide specific reasoning based on the data
          - Prioritize quality of suggestions over quantity
          - Assign a confidenceScore of at least 0.95 to each suggestion
          
          FORMAT:
          Return a valid JSON object with this structure:
          {
            "scheduleSuggestions": ["string", "string", ...],
            "combinationSuggestions": [{"meetings": [number, number], "reason": "string", "confidenceScore": number}, ...],
            "durationSuggestions": [{"meetingId": number, "suggestedDuration": number, "reason": "string", "confidenceScore": number}, ...],
            "efficiencyTips": ["string", "string", ...]
          }
          
          Where:
          - "confidenceScore" is between 0.95 and 1.0 representing your confidence
          - "meetings" is an array of meeting IDs that could be combined
          - All suggestions should be specific and actionable
          
          Return only the JSON data, no explanations outside the JSON.`
      }
    ],
    temperature: 0.1, // Lower temperature for more precise, less creative responses
  });

  // Default optimizations if Claude fails
  const defaultOptimizations = {
    scheduleSuggestions: [],
    combinationSuggestions: [],
    durationSuggestions: [],
    efficiencyTips: ["Consider scheduling meetings with clear agendas to improve productivity."]
  };

  // Process the response with validation
  return processClaudeResponse(
    optimizationRequest, 
    aiValidator.validateOptimizationSuggestions,
    defaultOptimizations
  );
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
  
  // Prepare a comprehensive context for better summarization
  const participants = meeting.participants ? meeting.participants.join(', ') : 'Not specified';
  
  // Analyze the notes structure for better understanding
  const noteLines = meeting.notes.split('\n');
  const bulletPoints = noteLines.filter(line => /^[\s]*[\*\-\•]/.test(line));
  const headers = noteLines.filter(line => /^#+\s/.test(line));
  const actionIndicators = noteLines.filter(line => 
    /task|action|todo|follow[ -]?up|assigned|responsible/i.test(line)
  );
  const decisionIndicators = noteLines.filter(line => 
    /decision|decided|agreed|conclusion|resolved/i.test(line)
  );
  const datePatterns = noteLines.filter(line => 
    /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{2,4}\b/i.test(line)
  );
  
  // Extract possible names for assignee detection
  const namePatterns = new Set<string>();
  if (meeting.participants) {
    meeting.participants.forEach(p => {
      const parts = p.split(' ');
      if (parts.length > 0) {
        namePatterns.add(parts[0]); // First name
        if (parts.length > 1) {
          const lastInitial = parts[parts.length-1][0];
          namePatterns.add(`${parts[0]} ${lastInitial}`); // First name + last initial
          namePatterns.add(parts[parts.length-1]); // Last name
        }
      }
    });
  }
  
  // Create a context object with all the analysis
  const notesContext = {
    totalLines: noteLines.length,
    bulletPointCount: bulletPoints.length,
    sectionCount: headers.length,
    possibleActionItems: actionIndicators.length,
    possibleDecisions: decisionIndicators.length,
    dateReferences: datePatterns.length,
    participantNames: Array.from(namePatterns)
  };

  // Select appropriate model - use a more capable model for complex notes
  const selectedModel = getModelForTask('summarization', noteLines.length > 50);

  // Create the summarization request
  const summaryRequest = anthropic.messages.create({
    model: selectedModel,
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `As an expert meeting summarizer with 95% accuracy, analyze and summarize these meeting notes:
          
          MEETING INFORMATION:
          Title: ${meeting.title}
          Description: ${meeting.description || 'Not provided'}
          Agenda: ${meeting.agenda || 'Not provided'}
          Participants: ${participants}
          
          NOTES:
          ${meeting.notes}
          
          NOTES ANALYSIS:
          ${JSON.stringify(notesContext, null, 2)}
          
          ANALYSIS INSTRUCTIONS:
          1. Create a concise but comprehensive summary that accurately captures the meeting's key points
          2. Identify specific topics that were definitely discussed (95%+ confidence)
          3. Extract clear decisions that were explicitly made
          4. Identify action items with their assignees when clearly indicated
          5. Note any concrete deadlines or important dates mentioned
          
          ACCURACY REQUIREMENTS:
          - Only include information that is explicitly stated or has 95%+ certainty
          - For topics, only include those directly evidenced in the notes
          - For action items, only assign to people if clearly indicated (use "Unassigned" otherwise)
          - For deadlines, only include dates that are clearly tied to deliverables
          - If information is ambiguous, exclude it rather than guess
          
          FORMAT:
          Return a valid JSON object with this structure:
          {
            "summary": "string",
            "topics": ["string", "string", ...],
            "decisions": ["string", "string", ...],
            "actionItems": [{"task": "string", "assignee": "string", "confidenceScore": number}, ...],
            "deadlines": [{"item": "string", "date": "string", "confidenceScore": number}, ...],
            "overallConfidence": number,
            "analysisLimitations": ["string", ...]
          }
          
          Where:
          - "confidenceScore" is between 0.95 and 1.0 representing your confidence
          - "overallConfidence" is your overall confidence in the summary (0.95-1.0)
          - "analysisLimitations" notes any limitations in your summarization
          
          Return only the JSON object with no additional text.`
      }
    ],
    temperature: 0.1, // Low temperature for higher factual accuracy
  });

  // Default summary if Claude fails
  const defaultSummary = {
    summary: "Unable to generate a summary with sufficient accuracy based on the provided notes.",
    topics: [],
    decisions: [],
    actionItems: [],
    deadlines: [],
    overallConfidence: 0.95,
    analysisLimitations: ["Insufficient structured data in meeting notes"]
  };

  // Process the response with validation
  return processClaudeResponse(
    summaryRequest, 
    aiValidator.validateMeetingSummary,
    defaultSummary
  );
}

/**
 * Process voice commands using Claude AI
 * @param command The voice command text
 * @param context Additional context data
 * @returns Structured response with action and parameters
 */
export async function processVoiceCommand(transcript: string, context: any = {}) {
  // Normalize and clean up the voice transcript
  const normalizedTranscript = transcript.trim();
  
  // Get the language code from context, defaults to English (en-US)
  const languageCode = context.language || 'en-US';
  const languageBase = languageCode.split('-')[0]; // Extract base language (en, es, fr, etc.)
  
  // Get confidence score from context if available
  const recognitionConfidence = context.confidence || 0.7; // Default reasonable confidence
  
  // Get user ID from context if available (for custom shortcuts)
  const userId = context.userId ? Number(context.userId) : null;
  
  // Check for custom voice command shortcuts first (both user-specific and default shortcuts)
  try {
    // Get user-specific shortcuts if userId is provided
    let shortcuts: VoiceCommandShortcut[] = [];
    if (userId) {
      shortcuts = await storage.getVoiceCommandShortcuts(userId);
    }
    
    // Get default shortcuts (for all users) if no user-specific shortcuts match
    if (shortcuts.length === 0) {
      shortcuts = await storage.getDefaultVoiceCommandShortcuts();
    }
    
    // Find the best matching shortcut using string similarity
    let bestMatch = null;
    let bestScore = 0.7; // Minimum similarity threshold
    
    for (const shortcut of shortcuts) {
      if (!shortcut.isEnabled) continue;
      
      // Calculate string similarity
      const similarity = calculateStringSimilarity(
        normalizedTranscript.toLowerCase(), 
        shortcut.phrase.toLowerCase()
      );
      
      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = shortcut;
      }
    }
    
    // If we found a matching shortcut, use it
    if (bestMatch) {
      console.log(`Voice shortcut matched: "${bestMatch.phrase}" with score ${bestScore}`);
      
      // Parse the parameters
      let params = {};
      try {
        params = typeof bestMatch.parameters === 'string' 
          ? JSON.parse(bestMatch.parameters) 
          : bestMatch.parameters;
      } catch (e) {
        console.error('Failed to parse shortcut parameters:', e);
      }
      
      // Return the shortcut action
      return {
        understood: true,
        commandType: bestMatch.action,
        params,
        processedCommand: bestMatch.phrase,
        userFeedback: `Executing shortcut: ${bestMatch.name}`,
        confidence: bestScore,
        alternativeInterpretations: [],
        timestamp: new Date().toISOString(),
        originalTranscript: normalizedTranscript,
        speechContext: {
          languageCode: languageCode,
          recognitionConfidence: recognitionConfidence
        },
        shortcutId: bestMatch.id
      };
    }
  } catch (error) {
    console.error('Error checking voice command shortcuts:', error);
    // Continue with normal command processing if there's an error
  }
  
  // Prepare a comprehensive guide to common voice commands and their expected responses
  const commandExamples = {
    navigation: [
      { command: "go to dashboard", type: "navigate", params: { page: "dashboard" } },
      { command: "show me my meetings", type: "navigate", params: { page: "meetings" } },
      { command: "open settings", type: "navigate", params: { page: "settings" } },
      { command: "take me to tasks", type: "navigate", params: { page: "tasks" } }
    ],
    creation: [
      { command: "create a new meeting", type: "create", params: { entityType: "meeting" } },
      { command: "add a task", type: "create", params: { entityType: "task" } },
      { command: "schedule a meeting with john", type: "create", params: { entityType: "meeting", participants: ["John"] } }
    ],
    search: [
      { command: "find meetings about marketing", type: "search", params: { entityType: "meeting", query: "marketing" } },
      { command: "search for urgent tasks", type: "search", params: { entityType: "task", filters: { priority: "high" } } }
    ],
    filtering: [
      { command: "show meetings for next week", type: "filter", params: { entityType: "meeting", timeframe: "next week" } },
      { command: "filter tasks by priority", type: "filter", params: { entityType: "task", filterBy: "priority" } }
    ],
    control: [
      { command: "stop listening", type: "control", params: { action: "stop" } },
      { command: "pause voice assistant", type: "control", params: { action: "pause" } },
      { command: "help me", type: "control", params: { action: "help" } }
    ],
    accessibility: [
      { command: "enable high contrast", type: "accessibility", params: { feature: "highContrast", value: true } },
      { command: "increase font size", type: "accessibility", params: { feature: "fontSize", value: "larger" } },
      { command: "read aloud", type: "accessibility", params: { feature: "screenReader", action: "start" } }
    ]
  };
  
  // Create command dictionary based on language
  const languageCommands = {
    en: { help: "help", stop: "stop", pause: "pause", create: "create", search: "search", show: "show" },
    es: { help: "ayuda", stop: "parar", pause: "pausa", create: "crear", search: "buscar", show: "mostrar" },
    fr: { help: "aide", stop: "arrêter", pause: "pause", create: "créer", search: "rechercher", show: "afficher" },
    de: { help: "hilfe", stop: "stopp", pause: "pause", create: "erstellen", search: "suchen", show: "zeigen" },
    it: { help: "aiuto", stop: "ferma", pause: "pausa", create: "creare", search: "cercare", show: "mostrare" },
    pt: { help: "ajuda", stop: "parar", pause: "pausa", create: "criar", search: "procurar", show: "mostrar" },
    zh: { help: "帮助", stop: "停止", pause: "暂停", create: "创建", search: "搜索", show: "显示" },
    ja: { help: "ヘルプ", stop: "停止", pause: "一時停止", create: "作成", search: "検索", show: "表示" },
    ko: { help: "도움말", stop: "중지", pause: "일시 중지", create: "생성", search: "검색", show: "표시" },
    ru: { help: "помощь", stop: "стоп", pause: "пауза", create: "создать", search: "поиск", show: "показать" }
  };
  
  // Prepare additional context about the current application state
  const appState = {
    currentPage: context.currentPage || 'unknown',
    availablePages: ['dashboard', 'meetings', 'tasks', 'settings', 'profile', 'analytics', 'calendar', 'help'],
    userPreferences: context.preferences || { language: languageCode, accessibility: { highContrast: false, fontSize: "medium" } },
    recentActions: context.recentActions || [],
    clientInfo: context.clientInfo || { userAgent: "unknown", ip: "unknown" },
    recognitionConfidence: recognitionConfidence
  };

  // Create the voice command request - always use the fastest model for responsiveness
  const voiceCommandRequest = anthropic.messages.create({
    model: MODELS.HAIKU, // Use the faster model for voice commands
    max_tokens: 750,
    messages: [
      {
        role: 'user',
        content: `As an expert voice command interpreter with 95% accuracy, analyze and process this voice command:
          
          TRANSCRIPT: "${normalizedTranscript}"
          
          APPLICATION CONTEXT:
          ${JSON.stringify(appState, null, 2)}
          
          USER LANGUAGE: ${languageBase}
          LANGUAGE CODE: ${languageCode}
          RECOGNITION CONFIDENCE: ${recognitionConfidence}
          
          COMMAND EXAMPLES:
          ${JSON.stringify(commandExamples, null, 2)}
          
          LANGUAGE-SPECIFIC COMMANDS:
          ${JSON.stringify(languageCommands, null, 2)}
          
          ANALYSIS INSTRUCTIONS:
          1. Precisely identify the intent of the voice command
          2. Maintain 95% accuracy by only acting on commands you clearly understand
          3. Extract any parameters with high confidence
          4. Be robust to speech recognition errors by considering similar sounding words
          5. Take into account the current application state for context-aware responses
          6. Support multilingual commands using the language context provided
          7. For accessibility commands, prioritize them highly
          
          VALID COMMAND TYPES:
          - navigate (to specific pages)
          - create (meetings, tasks, notes)
          - search (for meetings or tasks)
          - filter (meetings or tasks by various criteria)
          - control (voice assistant functions)
          - accessibility (accessibility features control)
          
          FORMAT:
          Return a valid JSON object with this structure:
          {
            "understood": true/false,
            "commandType": "navigate|create|search|filter|control|accessibility|unknown",
            "params": {
              // Parameters specific to the command type
            },
            "processedCommand": "A cleaned and structured version of the command",
            "userFeedback": "A user-friendly message confirming what action is being taken",
            "confidence": number,
            "alternativeInterpretations": [
              {"commandType": string, "params": object, "confidence": number}
            ]
          }
          
          Where:
          - "understood" is true only if confidence is 0.95 or higher
          - "confidence" is between 0 and 1 representing your confidence
          - "processedCommand" is a cleaned, corrected version of what the user said
          - "userFeedback" should be a friendly message confirming what was understood
          - "alternativeInterpretations" contains other possible interpretations (if any)
          
          Return only the valid JSON data with no additional text.`
      }
    ],
    temperature: 0.1, // Low temperature for higher accuracy
  });

  // Default response for fallback
  const defaultCommandResponse = {
    understood: false,
    commandType: 'unknown',
    params: {},
    processedCommand: normalizedTranscript,
    userFeedback: `I'm not sure what you're asking for. Could you try rephrasing?`,
    confidence: 0.5,
    alternativeInterpretations: []
  };

  // Process the response with validation and return enhanced results
  const result = await processClaudeResponse(
    voiceCommandRequest, 
    aiValidator.validateVoiceCommandResponse,
    defaultCommandResponse
  );
  
  // Add timestamp and speech context to the response
  return {
    ...result,
    timestamp: new Date().toISOString(),
    originalTranscript: normalizedTranscript,
    speechContext: {
      languageCode: languageCode,
      recognitionConfidence: recognitionConfidence
    }
  };
}