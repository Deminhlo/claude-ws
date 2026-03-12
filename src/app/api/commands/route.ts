import { NextResponse } from 'next/server';
import { createCommandService } from '@agentic-sdk/services/command/slash-command-listing';

const commandService = createCommandService();

// GET /api/commands - List available Claude commands (built-in + user-defined + skills)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath') ?? undefined;
    const commands = commandService.list(projectPath);
    return NextResponse.json(commands);
  } catch (error) {
    console.error('Failed to list commands:', error);
    return NextResponse.json({ error: 'Failed to list commands' }, { status: 500 });
  }
}
