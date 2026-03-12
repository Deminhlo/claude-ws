import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { formatOutput } from '@/lib/output-formatter';
import { waitForAttemptCompletion, AttemptTimeoutError } from '@/lib/attempt-waiter';
import { agentManager } from '@/lib/agent-manager';
import { sessionManager } from '@/lib/session-manager';
import { getContentTypeForFormat } from '@/lib/content-types';
import { createAttemptService } from '@agentic-sdk/services/attempt/attempt-crud-and-logs';
import { createForceCreateService, ForceCreateError } from '@agentic-sdk/services/force-create-project-and-task';
import { createProjectService } from '@agentic-sdk/services/project/project-crud';
import { createTaskService } from '@agentic-sdk/services/task/task-crud-and-reorder';
import type { ClaudeOutput, OutputFormat, RequestMethod } from '@/types';

const attemptService = createAttemptService(db);
const forceCreateService = createForceCreateService(db);
const projectService = createProjectService(db);
const taskService = createTaskService(db);

// POST /api/attempts - Create a new attempt and start agent execution
// WebSocket also supports attempt:start for backward compatibility
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      taskId,
      prompt,
      force_create,
      projectId,
      projectName,
      taskTitle,
      projectRootPath,
      request_method = 'queue',
      output_format,
      output_schema,
      timeout,
      model  // Optional: model ID for this attempt
    } = body;


    // Validate request_method
    if (request_method && request_method !== 'sync' && request_method !== 'queue') {
      return NextResponse.json(
        { error: 'Invalid request_method. Must be "sync" or "queue"' },
        { status: 400 }
      );
    }

    // Note: output_schema is optional but recommended for defining output structure
    // If provided, it will be included in the format instructions sent to the agent
    if (output_format && typeof output_format !== 'string') {
      return NextResponse.json(
        { error: 'output_format must be a string' },
        { status: 400 }
      );
    }

    if (!taskId || !prompt) {
      return NextResponse.json(
        { error: 'taskId and prompt are required' },
        { status: 400 }
      );
    }

    // Prepare prompt with schema instructions for custom format
    let finalPrompt = prompt;
    if (output_format === 'custom' && output_schema) {
      finalPrompt = `${output_schema}\n\n${prompt}`;
    }

    // Step 1: If force_create is not true, skip validation and create attempt directly
    if (!force_create) {
      // Validate task exists (current behavior)
      const task = await taskService.getById(taskId);

      if (!task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }

      // Create attempt with existing task
      return await createAttempt(
        task,
        finalPrompt,
        request_method,
        output_format,
        output_schema,
        timeout,
        model
      );
    }

    // Step 2: Check if taskId exists
    const existingTask = await taskService.getById(taskId);

    if (existingTask) {
      // Task exists, create attempt directly
      return await createAttempt(
        existingTask,
        finalPrompt,
        request_method,
        output_format,
        output_schema,
        timeout,
        model
      );
    }

    // Step 3: Task doesn't exist, use forceCreateService to ensure project+task exist
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId required' },
        { status: 400 }
      );
    }

    let newTask;
    try {
      const result = await forceCreateService.ensureProjectAndTask({
        taskId,
        projectId,
        projectName,
        taskTitle,
        projectRootPath,
        defaultBasePath: process.env.CLAUDE_WS_USER_CWD || process.cwd(),
      });
      newTask = result.task;
    } catch (error) {
      if (error instanceof ForceCreateError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create project or task' },
        { status: 500 }
      );
    }

    // Step 4: Create attempt with the newly created task
    return await createAttempt(
      newTask,
      finalPrompt,
      request_method,
      output_format,
      output_schema,
      timeout,
      model
    );

  } catch (error: any) {
    // Handle foreign key constraint (invalid taskId)
    if (error?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create attempt' },
      { status: 500 }
    );
  }
}

// Helper function to create attempt
async function createAttempt(
  task: any,
  prompt: string,
  requestMethod: RequestMethod = 'queue',
  outputFormat?: OutputFormat,
  outputSchema?: string,
  timeout?: number,
  model?: string
) {
  // Get project for agent execution
  const project = await projectService.getById(task.projectId);

  if (!project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 }
    );
  }

  // Create attempt record via SDK service
  const newAttempt = await attemptService.create({
    taskId: task.id,
    prompt,
    outputFormat: outputFormat || undefined,
    outputSchema: outputSchema || undefined,
  });

  // Get session options for conversation continuation
  const sessionOptions = await sessionManager.getSessionOptionsWithAutoFix(task.id);

  // Update task status to in_progress if it was todo
  if (task.status === 'todo') {
    await taskService.update(task.id, { status: 'in_progress' });
  }

  // Start the agent execution
  // Note: agentManager.start() will add system guidelines internally
  agentManager.start({
    attemptId: newAttempt.id,
    projectPath: project.path,
    prompt,
    model: model || undefined,  // Pass model to agent-manager
    sessionOptions: Object.keys(sessionOptions).length > 0 ? sessionOptions : undefined,
    outputFormat: outputFormat || undefined,
    outputSchema: outputSchema || undefined,
  });

  // Queue mode: return attempt ID immediately (existing behavior)
  if (requestMethod === 'queue') {
    return NextResponse.json(newAttempt, { status: 201 });
  }

  // Sync mode: wait for completion and return formatted output
  if (requestMethod === 'sync') {
    try {
      // Wait for attempt to complete (or timeout)
      const result = await waitForAttemptCompletion(newAttempt.id, { timeout });

      // If timed out, return error with attempt ID for fallback
      if (result.timedOut) {
        return NextResponse.json(
          {
            error: `Attempt timed out after ${timeout || 300000}ms`,
            attemptId: newAttempt.id,
            retryUrl: `/api/attempts/${newAttempt.id}`
          },
          { status: 408 }
        );
      }

      // If output_format is set, return file content from tmp directory
      if (outputFormat) {
        const dataDir = process.env.DATA_DIR || join(process.env.CLAUDE_WS_USER_CWD || process.cwd(), 'data');
        const filePath = join(dataDir, 'tmp', `${newAttempt.id}.${outputFormat}`);

        if (existsSync(filePath)) {
          try {
            const content = await readFile(filePath, 'utf-8');
            const contentType = getContentTypeForFormat(outputFormat);

            return new NextResponse(content, {
              headers: {
                'Content-Type': contentType,
              },
            });
          } catch (readError) {
            return NextResponse.json(
              { error: 'Failed to read output file' },
              { status: 500 }
            );
          }
        }

        // File doesn't exist, return error
        return NextResponse.json(
          { error: 'Output file not found', attemptId: newAttempt.id },
          { status: 404 }
        );
      }

      // No output_format: fetch logs and return formatted JSON (backward compatible)
      const logs = await attemptService.getLogs(newAttempt.id);

      // Parse JSON logs into ClaudeOutput messages
      const messages: ClaudeOutput[] = logs
        .filter((log: { type: string }) => log.type === 'json')
        .map((log: { content: string }) => {
          try {
            return JSON.parse(log.content) as ClaudeOutput;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as ClaudeOutput[];

      // Format and return
      const formatted = formatOutput(
        messages,
        'json',
        outputSchema || null,
        {
          id: result.attempt.id,
          taskId: result.attempt.taskId,
          prompt: result.attempt.prompt,
          status: result.attempt.status,
          createdAt: result.attempt.createdAt,
          completedAt: result.attempt.completedAt
        }
      );

      return NextResponse.json(formatted, { status: 200 });
    } catch (error) {
      // Handle timeout errors or other issues
      if (error instanceof AttemptTimeoutError) {
        return NextResponse.json(
          {
            error: error.message,
            attemptId: error.attemptId,
            retryUrl: `/api/attempts/${error.attemptId}`
          },
          { status: 408 }
        );
      }

      throw error;
    }
  }

  // Fallback for any other request_method value
  return NextResponse.json(newAttempt, { status: 201 });
}
