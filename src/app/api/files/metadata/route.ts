import { NextRequest, NextResponse } from 'next/server';
import { createFileOperationsService } from '@agentic-sdk/services/files/operations-and-upload';

const fileOpsService = createFileOperationsService();

// GET /api/files/metadata?path=xxx&basePath=xxx
// Returns file metadata (mtime, size) without reading content
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');
    const basePath = searchParams.get('basePath');

    if (!filePath || !basePath) {
      return NextResponse.json(
        { error: 'path and basePath parameters are required' },
        { status: 400 }
      );
    }

    const metadata = fileOpsService.getMetadata(basePath, filePath);
    return NextResponse.json(metadata);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Path traversal detected') {
        return NextResponse.json({ error: 'Invalid path: directory traversal detected' }, { status: 403 });
      }
      if (error.message === 'File not found') {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      if (error.message === 'Path is not a file') {
        return NextResponse.json({ error: 'Path is not a file' }, { status: 400 });
      }
    }
    console.error('Error getting file metadata:', error);
    return NextResponse.json({ error: 'Failed to get file metadata' }, { status: 500 });
  }
}
