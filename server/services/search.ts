import { pipeline } from '@xenova/transformers';
import stringSimilarity from 'string-similarity';
import { type Meeting } from '@shared/schema';

let embeddingModel: any = null;

async function initializeModel() {
  if (!embeddingModel) {
    // Using MiniLM as it's lightweight but effective for semantic search
    embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embeddingModel;
}

async function getEmbedding(text: string) {
  const model = await initializeModel();
  const output = await model(text, { pooling: 'mean', normalize: true });
  return output.data;
}

export async function semanticSearch(query: string, meetings: Meeting[]) {
  try {
    const queryEmbedding = await getEmbedding(query);
    
    // Create a map of meetings with their searchable content
    const searchableContent = meetings.map(meeting => ({
      meeting,
      content: [
        meeting.title,
        meeting.description,
        meeting.notes,
        meeting.agenda,
        meeting.summary
      ].filter(Boolean).join(' ')
    }));

    // Get embeddings for all meeting content
    const contentEmbeddings = await Promise.all(
      searchableContent.map(async ({ content }) => await getEmbedding(content))
    );

    // Calculate similarity scores
    const scores = contentEmbeddings.map((embedding, index) => {
      // Cosine similarity between query and content embeddings
      const similarity = stringSimilarity.compareTwoStrings(
        embedding.join(','),
        queryEmbedding.join(',')
      );
      
      return {
        meeting: searchableContent[index].meeting,
        score: similarity
      };
    });

    // Sort by similarity score and return top results
    return scores
      .sort((a, b) => b.score - a.score)
      .filter(item => item.score > 0.3) // Filter out low-relevance results
      .map(item => ({
        ...item.meeting,
        relevanceScore: item.score
      }));
  } catch (error) {
    console.error('Semantic search error:', error);
    throw new Error('Failed to perform semantic search');
  }
}
