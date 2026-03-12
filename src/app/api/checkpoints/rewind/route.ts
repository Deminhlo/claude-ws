import { NextResponse } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { db } from '@/lib/db';
import { checkpointManager } from '@/lib/checkpoint-manager';
import { sessionManager } from '@/lib/session-manager';
import { createCheckpointOperationsService } from '@agentic-sdk/services/checkpoints/fork-and-rewind-operations';
import { createLogger } from '@/lib/logger';

const log = createLogger('CheckpointRewindAPI');
const checkpointOpsService = createCheckpointOperationsService(db);

// Ensure file checkpointing is enabled (in case API route runs in separate process)
process.env.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING = '1';

// POST /api/checkpoints/rewind
// Body: { checkpointId: string, rewindFiles?: boolean }
// Deletes all attempts/logs/checkpoints after this checkpoint
// Optionally rewinds files using SDK rewindFiles()
// Returns the checkpoint's sessionId for resuming
export async function POST(request: Request) {
  try {
    const { checkpointId, rewindFiles = true } = await request.json();

    if (!checkpointId) {
      return NextResponse.json({ error: 'checkpointId required' }, { status: 400 });
    }

    // Get checkpoint + related data (for SDK rewind + response fields)
    const related = await checkpointOpsService.getCheckpointWithRelated(checkpointId);
    if (!related) {
      return NextResponse.json({ error: 'Checkpoint not found' }, { status: 404 });
    }
    const { checkpoint, attempt, project } = related as {
      checkpoint: any;
      task: any;
      attempt: any;
      project: any;
    };

    let sdkRewindResult: { success: boolean; error?: string } | null = null;

    // Rewind files using SDK if requested and checkpoint UUID exists
    // Note: gitCommitHash field stores SDK checkpoint UUID
    if (rewindFiles && checkpoint.gitCommitHash && checkpoint.sessionId && project) {
      sdkRewindResult = await attemptSdkFileRewind(checkpoint, project);
    }

    // Delete checkpoint's attempt + all later attempts/checkpoints via SDK service
    await checkpointOpsService.rewindWithCleanup(checkpointId);

    // Set rewind state on task so next attempt resumes at this checkpoint's message
    if (checkpoint.gitCommitHash) {
      await sessionManager.setRewindState(
        checkpoint.taskId,
        checkpoint.sessionId,
        checkpoint.gitCommitHash
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: checkpoint.sessionId,
      messageUuid: checkpoint.gitCommitHash,
      taskId: checkpoint.taskId,
      attemptId: checkpoint.attemptId,
      attemptPrompt: attempt?.prompt || null,
      sdkRewind: sdkRewindResult,
      conversationRewound: !!checkpoint.gitCommitHash,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to rewind checkpoint');
    return NextResponse.json(
      { error: 'Failed to rewind checkpoint' },
      { status: 500 }
    );
  }
}

/**
 * Attempt to rewind files using SDK checkpointing.
 * Returns result object; does not throw on failure.
 */
async function attemptSdkFileRewind(
  checkpoint: { sessionId: string; gitCommitHash: string },
  project: { path: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    log.info({ projectPath: project.path, sessionId: checkpoint.sessionId, messageUuid: checkpoint.gitCommitHash }, 'Attempting SDK file rewind');

    const checkpointOptions = checkpointManager.getCheckpointingOptions();

    // Resume the session WITHOUT resumeSessionAt - let rewindFiles handle positioning
    const rewindQuery = query({
      prompt: '',
      options: {
        cwd: project.path,
        resume: checkpoint.sessionId,
        ...checkpointOptions,
      },
    });

    // Wait for SDK initialization before calling rewindFiles
    await rewindQuery.supportedCommands();

    // List available checkpoints for debugging (may not exist in all SDK versions)
    const checkpointsList = await (rewindQuery as any).listCheckpoints?.();
    log.debug({ checkpointsList: checkpointsList || 'listCheckpoints not available' }, 'Available checkpoints');

    const rewindResult = await rewindQuery.rewindFiles(checkpoint.gitCommitHash);

    if (!rewindResult.canRewind) {
      const baseError = rewindResult.error || 'Cannot rewind files';
      const contextualError = baseError.includes('No file checkpoint')
        ? `${baseError}. Note: SDK only tracks files within the project directory (${project.path}). Files created at absolute paths outside this directory are not tracked.`
        : baseError;
      throw new Error(contextualError);
    }

    log.info({ filesChanged: rewindResult.filesChanged?.length || 0, insertions: rewindResult.insertions || 0, deletions: rewindResult.deletions || 0 }, 'Files changed');
    log.info({ checkpointId: checkpoint.sessionId }, 'SDK rewind successful');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ err: error }, 'SDK rewind failed');
    return { success: false, error: errorMessage };
    // Continue with conversation rewind even if SDK rewind fails
  }
}
