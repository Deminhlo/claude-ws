import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { createAgentFactoryService } from '@agentic-sdk/services/agent-factory/agent-factory-plugin-registry';
import { createProjectService } from '@agentic-sdk/services/project/project-crud';
import { createLogger } from '@/lib/logger';

const log = createLogger('AFInstalled');
const agentFactoryService = createAgentFactoryService(db);
const projectService = createProjectService(db);

// GET /api/agent-factory/projects/[projectId]/installed - Get installed components
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const { projectId } = await params;
    const project = await projectService.getById(projectId);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const result = await agentFactoryService.getInstalledComponents(projectId, project.path);

    return NextResponse.json(result);
  } catch (error) {
    log.error({ error }, 'Error checking installed components');
    return NextResponse.json({ error: 'Failed to check installed components' }, { status: 500 });
  }
}
