import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { createAgentFactoryService } from '@agentic-sdk/services/agent-factory/agent-factory-plugin-registry';
import { createAgentFactoryFilesystemService } from '@agentic-sdk/services/agent-factory/plugin-filesystem-operations';

const agentFactoryService = createAgentFactoryService(db);
const filesystemService = createAgentFactoryFilesystemService();

interface SaveFileRequest {
  filePath: string;
  content: string;
}

// PUT /api/agent-factory/components/[id]/files/save - Save file content
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json() as SaveFileRequest;
    const { filePath, content } = body;

    const plugin = await agentFactoryService.getPlugin(id);

    if (!plugin) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    }

    const result = await filesystemService.savePluginFile(plugin, filePath, content);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
  }
}
