import { NextRequest, NextResponse } from 'next/server';
import { createFileSearchService } from '@agentic-sdk/services/files/search-and-content-search';

const fileSearchService = createFileSearchService();

/**
 * GET /api/search/content - Search file contents (grep-like)
 * Query params:
 *   - q: search query
 *   - basePath: project root path
 *   - caseSensitive: boolean (default false)
 *   - regex: boolean (default false)
 *   - wholeWord: boolean (default false)
 *   - limit: max results per file (default 100)
 *   - maxFiles: max files to return (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const basePath = searchParams.get('basePath');
    const caseSensitive = searchParams.get('caseSensitive') === 'true';
    const regex = searchParams.get('regex') === 'true';
    const wholeWord = searchParams.get('wholeWord') === 'true';
    const limitPerFile = parseInt(searchParams.get('limit') || '100', 10);
    const maxFiles = parseInt(searchParams.get('maxFiles') || '50', 10);

    if (!basePath) {
      return NextResponse.json({ error: 'basePath parameter is required' }, { status: 400 });
    }

    if (!query.trim()) {
      return NextResponse.json({ error: 'q (query) parameter is required' }, { status: 400 });
    }

    const result = await fileSearchService.searchContentAdvanced(basePath, query, {
      caseSensitive,
      regex,
      wholeWord,
      limitPerFile,
      maxFiles,
    });

    return NextResponse.json({ ...result, query });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Path does not exist') {
        return NextResponse.json({ error: 'Path does not exist' }, { status: 404 });
      }
      if (error.message === 'Invalid regex pattern') {
        return NextResponse.json({ error: 'Invalid regex pattern' }, { status: 400 });
      }
    }
    console.error('Error searching content:', error);
    return NextResponse.json({ error: 'Failed to search content' }, { status: 500 });
  }
}
