import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { createAgentFactoryService } from '@agentic-sdk/services/agent-factory/agent-factory-plugin-registry';
import { createAgentFactoryFilesystemService } from '@agentic-sdk/services/agent-factory/plugin-filesystem-operations';

const agentFactoryService = createAgentFactoryService(db);
const filesystemService = createAgentFactoryFilesystemService();

// GET /api/agent-factory/components/[id]/files/[...path] - Read file content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const { id, path } = await params;
    const plugin = await agentFactoryService.getPlugin(id);

    if (!plugin) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    }

    const result = await filesystemService.readPluginFile(plugin, path);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
