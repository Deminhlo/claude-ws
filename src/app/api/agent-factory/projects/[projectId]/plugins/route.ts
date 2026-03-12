import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { existsSync } from 'fs';
import { createAgentFactoryService } from '@agentic-sdk/services/agent-factory/agent-factory-plugin-registry';
import { createLogger } from '@/lib/logger';

const log = createLogger('AFProjectPlugins');
const agentFactoryService = createAgentFactoryService(db);

// Check if a plugin's source folder exists on the filesystem
function pluginSourceExists(plugin: {
  type: string;
  sourcePath: string | null;
  agentSetPath?: string | null;
}): boolean {
  if (plugin.type === 'agent_set') {
    return !!(plugin.agentSetPath && existsSync(plugin.agentSetPath));
  }
  return !!(plugin.sourcePath && existsSync(plugin.sourcePath));
}

// GET /api/agent-factory/projects/:projectId/plugins - Get plugins for project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const { projectId } = await params;
    const assignedPlugins = await agentFactoryService.listProjectPlugins(projectId);

    // Check which plugins have missing source folders and remove orphans
    const missingPluginIds: string[] = [];
    const validPlugins = (assignedPlugins as any[]).filter((plugin: any) => {
      if (pluginSourceExists(plugin)) return true;
      missingPluginIds.push(plugin.id);
      return false;
    });

    if (missingPluginIds.length > 0) {
      for (const pluginId of missingPluginIds) {
        await agentFactoryService.deletePlugin(pluginId);
      }
      log.info({ count: missingPluginIds.length }, 'Removed orphaned plugins with missing source folders');
    }

    return NextResponse.json({ plugins: validPlugins });
  } catch (error) {
    log.error({ error }, 'Error fetching project plugins');
    return NextResponse.json({ error: 'Failed to fetch project plugins' }, { status: 500 });
  }
}

// POST /api/agent-factory/projects/:projectId/plugins - Assign plugin to project
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
    const { pluginId } = body;

    if (!pluginId) {
      return NextResponse.json({ error: 'Missing pluginId' }, { status: 400 });
    }

    const plugin = await agentFactoryService.getPlugin(pluginId);
    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    try {
      const assignment = await agentFactoryService.associatePlugin(projectId, pluginId);
      return NextResponse.json({ assignment }, { status: 201 });
    } catch (err: any) {
      if (err?.message?.includes('UNIQUE') || err?.code === 'SQLITE_CONSTRAINT') {
        return NextResponse.json({ error: 'Plugin already assigned to project' }, { status: 409 });
      }
      throw err;
    }
  } catch (error) {
    log.error({ error }, 'Error assigning plugin');
    return NextResponse.json({ error: 'Failed to assign plugin' }, { status: 500 });
  }
}

// DELETE /api/agent-factory/projects/:projectId/plugins - Remove assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const pluginId = searchParams.get('pluginId');

    if (!pluginId) {
      return NextResponse.json({ error: 'Missing pluginId parameter' }, { status: 400 });
    }

    await agentFactoryService.disassociatePlugin(projectId, pluginId);

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error }, 'Error removing plugin assignment');
    return NextResponse.json({ error: 'Failed to remove plugin' }, { status: 500 });
  }
}
