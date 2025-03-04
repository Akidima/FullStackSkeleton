import { pipeline } from '@xenova/transformers';

export class AIInsightsService {
  private static instance: AIInsightsService;
  private classifier: any;
  private generator: any;

  private constructor() {}

  public static async getInstance(): Promise<AIInsightsService> {
    if (!AIInsightsService.instance) {
      AIInsightsService.instance = new AIInsightsService();
      await AIInsightsService.instance.initialize();
    }
    return AIInsightsService.instance;
  }

  private async initialize() {
    // Initialize the zero-shot classification pipeline
    this.classifier = await pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased-mnli');
    
    // Initialize the text generation pipeline
    this.generator = await pipeline('text2text-generation', 'Xenova/t5-small');
  }

  public async generateMeetingInsights(
    meetingTitle: string,
    description: string,
    previousOutcomes: string[]
  ): Promise<{ insight: string; category: string; relevanceScore: number }[]> {
    const categories = ['policy', 'historical', 'best_practice'];
    const combinedText = `Meeting: ${meetingTitle}\nDescription: ${description}\nPrevious Outcomes: ${previousOutcomes.join(', ')}`;

    try {
      // Classify the meeting context
      const classification = await this.classifier(combinedText, categories);

      // Generate insights based on the most relevant category
      const prompt = `Based on the meeting "${meetingTitle}" with description "${description}", 
                     provide a business insight or recommendation. Focus on ${classification.labels[0]}.`;
      
      const generated = await this.generator(prompt, {
        max_length: 100,
        num_return_sequences: 1
      });

      const insight = generated[0].generated_text;
      
      // Calculate relevance score (0-10) based on classification confidence
      const relevanceScore = Math.round(classification.scores[0] * 10);

      return [{
        insight,
        category: classification.labels[0],
        relevanceScore
      }];
    } catch (error) {
      console.error('Error generating meeting insights:', error);
      return [];
    }
  }

  public async getRealtimeRecommendations(
    currentDiscussion: string,
    meetingContext: string
  ): Promise<string[]> {
    try {
      const prompt = `Given the current discussion: "${currentDiscussion}" 
                     in the context of: "${meetingContext}", 
                     suggest actionable next steps or recommendations.`;

      const generated = await this.generator(prompt, {
        max_length: 150,
        num_return_sequences: 3
      });

      return generated.map((g: any) => g.generated_text);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }
}

export const getAIInsights = () => AIInsightsService.getInstance();
