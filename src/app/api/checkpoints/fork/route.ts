import { NextResponse } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { db } from '@/lib/db';
import { checkpointManager } from '@/lib/checkpoint-manager';
import { sessionManager } from '@/lib/session-manager';
import { createCheckpointOperationsService } from '@agentic-sdk/services/checkpoints/fork-and-rewind-operations';
import { createLogger } from '@/lib/logger';

const log = createLogger('CheckpointForkAPI');
const checkpointOpsService = createCheckpointOperationsService(db);

// Ensure file checkpointing is enabled (in case API route runs in separate process)
process.env.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING = '1';

// POST /api/checkpoints/fork
// Body: { checkpointId: string }
// Creates a NEW task that forks conversation from a checkpoint.
// The original task and its attempts/checkpoints are left untouched.
// Rewinds files using SDK rewindFiles() when checkpoint UUID exists.
// Returns the new task for the UI to navigate to.
export async function POST(request: Request) {
  try {
    const { checkpointId } = await request.json();

    if (!checkpointId) {
      return NextResponse.json({ error: 'checkpointId required' }, { status: 400 });
    }

    // Get checkpoint + related data for SDK rewind
    const related = await checkpointOpsService.getCheckpointWithRelated(checkpointId);
    if (!related) {
      return NextResponse.json({ error: 'Checkpoint not found' }, { status: 404 });
    }
    const { checkpoint, task: originalTask, attempt, project } = related as {
      checkpoint: any;
      task: any;
      attempt: any;
      project: any;
    };

    if (!originalTask) {
      return NextResponse.json({ error: 'Original task not found' }, { status: 404 });
    }

    // Attempt SDK file rewind if checkpoint UUID exists
    let sdkRewindResult: { success: boolean; error?: string } | null = null;
    if (checkpoint.gitCommitHash && checkpoint.sessionId && project) {
      sdkRewindResult = await attemptSdkFileRewind(checkpoint, project);
    }

    // Fork DB ops via SDK service (creates new task, copies attempts/checkpoints)
    const { newTask, newTaskId } = await checkpointOpsService.fork(checkpointId);

    // Set rewind state so the new task's first attempt resumes from the checkpoint
    if (checkpoint.gitCommitHash) {
      await sessionManager.setRewindState(newTaskId, checkpoint.sessionId, checkpoint.gitCommitHash);
    }

    return NextResponse.json({
      success: true,
      task: newTask,
      taskId: newTaskId,
      originalTaskId: originalTask.id,
      sessionId: checkpoint.sessionId,
      messageUuid: checkpoint.gitCommitHash,
      attemptId: checkpoint.attemptId,
      attemptPrompt: attempt?.prompt || null,
      sdkRewind: sdkRewindResult,
      conversationForked: !!checkpoint.gitCommitHash,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fork from checkpoint');
    return NextResponse.json({ error: 'Failed to fork from checkpoint' }, { status: 500 });
  }
}

/**
 * Attempt to rewind files using SDK checkpointing.
 * Returns result object; does not throw on failure.
 */
async function attemptSdkFileRewind(
  checkpoint: { sessionId: string; gitCommitHash: string | null },
  project: { path: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    log.info({ projectPath: project.path, sessionId: checkpoint.sessionId, messageUuid: checkpoint.gitCommitHash }, 'Attempting SDK file rewind for fork');

    const checkpointOptions = checkpointManager.getCheckpointingOptions();
    const rewindQuery = query({
      prompt: '',
      options: {
        cwd: project.path,
        resume: checkpoint.sessionId,
        ...checkpointOptions,
      },
    });

    await rewindQuery.supportedCommands();

    const rewindResult = await rewindQuery.rewindFiles(checkpoint.gitCommitHash!);
    if (!rewindResult.canRewind) {
      const baseError = rewindResult.error || 'Cannot rewind files';
      throw new Error(
        baseError.includes('No file checkpoint')
          ? `${baseError}. SDK only tracks files within project directory (${project.path}).`
          : baseError
      );
    }

    log.info({ filesChanged: rewindResult.filesChanged?.length || 0 }, 'SDK file rewind for fork successful');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ err: error }, 'SDK rewind for fork failed');
    return { success: false, error: errorMessage };
  }
}
