import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { createAgentFactoryFilesystemService } from '@agentic-sdk/services/agent-factory/plugin-filesystem-operations';

const fsService = createAgentFactoryFilesystemService();

// POST /api/agent-factory/files - List files from source path (for discovered components)
export async function POST(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) return unauthorizedResponse();

    const body = await request.json();
    const { sourcePath, type } = body;

    if (!sourcePath || !type) {
      return NextResponse.json({ error: 'Missing sourcePath or type' }, { status: 400 });
    }

    const result = await fsService.listSourcePathFiles(sourcePath, type);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}
