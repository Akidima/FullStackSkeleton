import { pipeline } from '@xenova/transformers';
import stringSimilarity from 'string-similarity';
import { type Meeting } from '@shared/schema';

let embeddingModel: any = null;

async function initializeModel() {
  if (!embeddingModel) {
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

    const contentEmbeddings = await Promise.all(
      searchableContent.map(async ({ content }) => await getEmbedding(content))
    );

    const scores = contentEmbeddings.map((embedding, index) => {
      const similarity = stringSimilarity.compareTwoStrings(
        embedding.join(','),
        queryEmbedding.join(',')
      );

      return {
        meeting: searchableContent[index].meeting,
        score: similarity
      };
    });

    return scores
      .sort((a, b) => b.score - a.score)
      .filter(item => item.score > 0.3)
      .map(item => ({
        ...item.meeting,
        relevanceScore: item.score
      }));
  } catch (error) {
    console.error('MeetMate search error:', error);
    throw new Error('Failed to perform semantic search');
  }
}