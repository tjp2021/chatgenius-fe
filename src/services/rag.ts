import { searchMessages, Message } from '@/api/search';
import { api } from '@/lib/axios';

interface ContextMessage {
  id: string;           // Message ID
  content: string;      // Message content
  channelId: string;    // Channel ID
  userId: string;       // User ID
  score: number;       // Relevance score
}

interface RAGContext {
  messages: ContextMessage[];  // Retrieved messages used for context
  scores: number[];           // Relevance scores for messages
  channels: string[];         // Channels involved
}

interface RAGMetadata {
  processingTime: number;   // Total processing time in ms
  tokensUsed: number;      // Total tokens consumed
  model: string;           // AI model used
  contextSize: number;     // Number of context messages used
}

interface RAGResponse {
  answer: string;            // AI-generated answer
  context: RAGContext;       // Retrieved context used
  metadata: RAGMetadata;     // Additional metadata
}

interface RAGErrorResponse {
  error: string;           // Error message
  code: RAGErrorCode;      // Error code
  details?: any;          // Additional error details
  status: number;         // HTTP status code
}

type RAGErrorCode = 
  | 'CONTEXT_RETRIEVAL_FAILED'  // Could not get relevant context
  | 'AI_GENERATION_FAILED'      // AI response generation failed
  | 'INVALID_QUERY'            // Query format invalid
  | 'UNAUTHORIZED'             // Missing/invalid auth
  | 'RATE_LIMITED'            // Too many requests
  | 'INTERNAL_ERROR';         // Server error

export class RAGService {
  static async getResponse(query: string, channelId?: string, userId?: string): Promise<RAGResponse> {
    console.log('=== RAG getResponse Start ===');
    console.log('Input Parameters:', { query, channelId, userId });

    if (!userId) {
      console.error('No userId provided');
      throw new Error('User ID is required for RAG operations');
    }

    try {
      // Get relevant messages using vector search
      console.log('Calling searchMessages...');
      const searchResults = await searchMessages(
        query, 
        userId,
        channelId ? { channelId: { $eq: channelId } } : undefined
      );
      console.log('Raw Search Results:', JSON.stringify(searchResults, null, 2));
      
      // Log before filtering
      console.log('Before filtering messages. Items:', searchResults.items?.length || 0);
      
      // Get both highly relevant and somewhat relevant messages
      const highlyRelevant = searchResults.items?.filter(msg => msg.score > 0.75) || [];
      const somewhatRelevant = searchResults.items?.filter(msg => msg.score > 0.5 && msg.score <= 0.75) || [];
      
      console.log('Highly relevant messages:', highlyRelevant.length);
      console.log('Somewhat relevant messages:', somewhatRelevant.length);

      // If no highly relevant messages, provide graceful fallback
      if (highlyRelevant.length === 0) {
        const fallbackResponse: RAGResponse = {
          answer: somewhatRelevant.length > 0 
            ? "I found some messages that might be related, but they're not exact matches. Here's what I found:"
            : "I couldn't find any messages specifically about that topic. Feel free to start a discussion about it or try rephrasing your question.",
          context: {
            messages: somewhatRelevant.map(msg => ({
              id: msg.id,
              content: msg.content,
              channelId: msg.channelId,
              userId: msg.userId,
              score: msg.score
            })),
            scores: somewhatRelevant.map(msg => msg.score),
            channels: Array.from(new Set(somewhatRelevant.map(msg => msg.channelId)))
          },
          metadata: {
            processingTime: 0,
            tokensUsed: 0,
            model: "fallback",
            contextSize: somewhatRelevant.length
          }
        };
        return fallbackResponse;
      }

      // Proceed with highly relevant messages
      const context = {
        messages: highlyRelevant.map(msg => ({
          id: msg.id,
          content: msg.content,
          channelId: msg.channelId,
          userId: msg.userId,
          score: msg.score
        })),
        scores: highlyRelevant.map(msg => msg.score),
        channels: Array.from(new Set(highlyRelevant.map(msg => msg.channelId)))
      };

      // Call search endpoint with context
      const response = await api.post<RAGResponse>('/search', {
        query: `/rag ${query}`,
        context,
        channelId: channelId || undefined,
        minScore: 0.75
      });

      return response.data;
    } catch (error: any) {
      console.error('=== RAG Error Details ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      if (error?.response) {
        console.error('API Error Response:', {
          status: error.response?.status,
          data: error.response?.data
        });
      }
      throw error;
    }
  }

  static async getSuggestion(content: string, channelId?: string, userId?: string): Promise<string | null> {
    if (!userId) {
      throw new Error('User ID is required for RAG operations');
    }

    try {
      // Get relevant messages
      const searchResults = await searchMessages(
        content, 
        userId,
        channelId ? { channelId: { $eq: channelId } } : undefined
      );

      const relevantMessages = searchResults.items.filter(msg => msg.score > 0.85);

      if (relevantMessages.length === 0) {
        return null;
      }

      // Format messages for context
      const context = {
        messages: relevantMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          channelId: msg.channelId,
          userId: msg.userId,
          score: msg.score
        })),
        scores: relevantMessages.map(msg => msg.score),
        channels: Array.from(new Set(relevantMessages.map(msg => msg.channelId)))
      };

      // Call search endpoint
      const response = await api.post<{ suggestion: string }>('/search', {
        content,
        context,
        channelId,
        userId
      });

      return response.data.suggestion;
    } catch (error) {
      console.error('Failed to get suggestion:', error);
      return null;
    }
  }
} 