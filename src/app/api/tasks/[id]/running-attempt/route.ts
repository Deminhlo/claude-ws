import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createTaskService } from '@agentic-sdk/services/task/task-crud-and-reorder';

const taskService = createTaskService(db);

// GET /api/tasks/[id]/running-attempt - Get currently running attempt and its messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const result = await taskService.getRunningAttempt(taskId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching running attempt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch running attempt' },
      { status: 500 }
    );
  }
}
