import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { createAgentFactoryService } from '@agentic-sdk/services/agent-factory/agent-factory-plugin-registry';
import { createProjectService } from '@agentic-sdk/services/project/project-crud';
import { createLogger } from '@/lib/logger';

const log = createLogger('AgentFactoryProjectSyncAPI');
const agentFactoryService = createAgentFactoryService(db);
const projectService = createProjectService(db);

// POST /api/agent-factory/projects/[projectId]/sync - Install components to project
export async function POST(
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

    const result = await agentFactoryService.syncProject(projectId, project.path);

    if (!result.success && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Installed ${result.installed?.length ?? 0} components to project`,
      installed: result.installed ?? [],
      skipped: result.skipped ?? [],
      errors: result.errors ?? [],
    });
  } catch (error) {
    log.error({ err: error }, 'Error installing components');
    return NextResponse.json({ error: 'Failed to install components' }, { status: 500 });
  }
}
