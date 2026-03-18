import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { getAgentFactoryDir } from '@agentic-sdk/services/agent-factory/dir-resolver';
import { createAgentFactoryFilesystemService } from '@agentic-sdk/services/agent-factory/plugin-filesystem-operations';

const fsService = createAgentFactoryFilesystemService();

// POST /api/agent-factory/discover - Scan filesystem for components
export async function POST(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) return unauthorizedResponse();

    const excludeDir = getAgentFactoryDir();
    const discovered = await fsService.discoverComponents(excludeDir);

    return NextResponse.json({ discovered });
  } catch (error) {
    console.error('Error discovering components:', error);
    return NextResponse.json({ error: 'Failed to discover components' }, { status: 500 });
  }
}
