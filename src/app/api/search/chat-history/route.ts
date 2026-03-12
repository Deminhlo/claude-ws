import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createChatHistorySearchService } from '@agentic-sdk/services/chat-history-search';

const chatHistorySearchService = createChatHistorySearchService(db);

/**
 * GET /api/search/chat-history - Search chat history across tasks
 * Query params:
 *   - q: search query (min 2 chars)
 *   - projectId: filter by single project ID
 *   - projectIds: comma-separated project IDs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const projectId = searchParams.get('projectId') || undefined;
    const projectIdsRaw = searchParams.get('projectIds');

    if (!query || query.length < 2) {
      return NextResponse.json({ matches: [] });
    }

    const projectIds = projectIdsRaw ? projectIdsRaw.split(',').filter(Boolean) : undefined;

    const matches = await chatHistorySearchService.searchChatHistory(query, { projectId, projectIds });

    return NextResponse.json({ matches, query });
  } catch (error) {
    console.error('Error searching chat history:', error);
    return NextResponse.json({ error: 'Failed to search chat history' }, { status: 500 });
  }
}
