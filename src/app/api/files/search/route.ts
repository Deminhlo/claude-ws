import { NextRequest, NextResponse } from 'next/server';
import { createFileSearchService } from '@agentic-sdk/services/files/search-and-content-search';

const fileSearchService = createFileSearchService();

// GET /api/files/search?basePath=xxx&query=xxx&limit=10
// Search files by name with fuzzy matching, sorted by relevance
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const basePath = searchParams.get('basePath');
    const query = searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!basePath) {
      return NextResponse.json({ error: 'basePath parameter is required' }, { status: 400 });
    }

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const results = fileSearchService.searchFilesByName(basePath, query, limit);
    return NextResponse.json({ results });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Path does not exist') {
      return NextResponse.json({ error: 'Path does not exist' }, { status: 404 });
    }
    console.error('Error searching files:', error);
    return NextResponse.json({ error: 'Failed to search files' }, { status: 500 });
  }
}
