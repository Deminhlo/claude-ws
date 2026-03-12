import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { createAgentFactoryService } from '@agentic-sdk/services/agent-factory/agent-factory-plugin-registry';
import { createProjectService } from '@agentic-sdk/services/project/project-crud';
import { createLogger } from '@/lib/logger';

const log = createLogger('AFUninstall');
const agentFactoryService = createAgentFactoryService(db);
const projectService = createProjectService(db);

// POST /api/agent-factory/projects/[projectId]/uninstall - Uninstall a component
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const { projectId } = await params;
    const body = await request.json();
    const { componentId } = body;

    if (!componentId) {
      return NextResponse.json({ error: 'componentId is required' }, { status: 400 });
    }

    const project = await projectService.getById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const result = await agentFactoryService.uninstallComponent(projectId, componentId, project.path);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to uninstall component' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    log.error({ error }, 'Error uninstalling component');
    return NextResponse.json({ error: 'Failed to uninstall component' }, { status: 500 });
  }
}
