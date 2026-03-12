import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { createAgentFactoryService } from '@agentic-sdk/services/agent-factory/agent-factory-plugin-registry';

const agentFactoryService = createAgentFactoryService(db);

// POST /api/agent-factory/dependencies/:id/install - Install a dependency
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const result = await agentFactoryService.installDependency(id);

    if (!result) {
      return NextResponse.json({ error: 'Dependency not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error installing dependency:', error);
    return NextResponse.json({ error: 'Failed to install dependency' }, { status: 500 });
  }
}
