import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { createAgentFactoryFilesystemService } from '@agentic-sdk/services/agent-factory/plugin-filesystem-operations';

const fsService = createAgentFactoryFilesystemService();

// POST /api/agent-factory/file-content - Read file content from source path (for discovered components)
export async function POST(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) return unauthorizedResponse();

    const body = await request.json();
    const { basePath, filePath } = body;

    if (!basePath || !filePath) {
      return NextResponse.json({ error: 'Missing basePath or filePath' }, { status: 400 });
    }

    const result = await fsService.readSourceFileContent(basePath, filePath);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
