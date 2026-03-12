import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createTaskService } from '@agentic-sdk/services/task/task-crud-and-reorder';

const taskService = createTaskService(db);

// GET /api/tasks/[id]/stats - Aggregate token/cost/diff stats across all attempts
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const stats = await taskService.getStats(taskId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting task stats:', error);
    return NextResponse.json(
      { error: 'Failed to get task stats' },
      { status: 500 }
    );
  }
}
