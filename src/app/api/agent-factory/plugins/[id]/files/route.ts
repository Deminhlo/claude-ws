import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { createAgentFactoryService } from '@agentic-sdk/services/agent-factory/agent-factory-plugin-registry';
import { createAgentFactoryFilesystemService } from '@agentic-sdk/services/agent-factory/plugin-filesystem-operations';

const agentFactoryService = createAgentFactoryService(db);
const filesystemService = createAgentFactoryFilesystemService();

// GET /api/agent-factory/plugins/[id]/files - List files in plugin directory
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const plugin = await agentFactoryService.getPlugin(id);

    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    const result = await filesystemService.listPluginFiles(plugin);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ files: result.files });
  } catch (error) {
    console.error('Error listing plugin files:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}
