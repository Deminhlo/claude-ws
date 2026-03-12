import { NextRequest, NextResponse } from 'next/server';
import { fuzzyMatch } from '@/lib/fuzzy-match';
import { createFileSearchService } from '@agentic-sdk/services/files/search-and-content-search';

const fileSearchService = createFileSearchService();

/**
 * GET /api/search/files - Fuzzy search for files by name
 * Query params:
 *   - q: search query
 *   - basePath: project root path
 *   - limit: max results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const basePath = searchParams.get('basePath');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!basePath) {
      return NextResponse.json({ error: 'basePath parameter is required' }, { status: 400 });
    }

    const { results, total } = fileSearchService.fuzzySearchFiles(basePath, query, limit, fuzzyMatch);

    return NextResponse.json({ results, total });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Path does not exist') {
      return NextResponse.json({ error: 'Path does not exist' }, { status: 404 });
    }
    console.error('Error searching files:', error);
    return NextResponse.json({ error: 'Failed to search files' }, { status: 500 });
  }
}
