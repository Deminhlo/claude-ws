import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { createAgentFactoryService } from '@agentic-sdk/services/agent-factory/agent-factory-plugin-registry';

const agentFactoryService = createAgentFactoryService(db);

// POST /api/agent-factory/compare - Compare discovered components with imported ones
export async function POST(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) return unauthorizedResponse();

    const body = await request.json();
    const { discovered } = body;

    if (!Array.isArray(discovered)) {
      return NextResponse.json({ error: 'discovered must be an array' }, { status: 400 });
    }

    const result = await agentFactoryService.comparePlugins(discovered);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error comparing plugins:', error);
    return NextResponse.json({ error: 'Failed to compare plugins' }, { status: 500 });
  }
}
