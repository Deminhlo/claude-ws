import fs from 'fs';
import path from 'path';
import { constants as fsConstants } from 'fs';
import { access, stat } from 'fs/promises';
import { createHash } from 'crypto';

export type WorkspacePathSource = 'request' | 'env';

export class WorkspacePathError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'WorkspacePathError';
    this.statusCode = statusCode;
  }
}

export function isLiteMode(): boolean {
  return process.env.CLAUDE_WS_MODE === 'lite';
}

function getConfiguredWorkspacePath(): string | undefined {
  const raw = process.env.CLAUDE_WS_PROJECT_PATH?.trim();
  return raw ? raw : undefined;
}

function assertAbsolutePath(candidate: string): void {
  if (!path.isAbsolute(candidate)) {
    throw new WorkspacePathError('workspace path must be an absolute path');
  }
}

function validateWorkspacePathSync(candidate: string): string {
  assertAbsolutePath(candidate);
  const normalized = path.resolve(candidate);
  const stats = fs.statSync(normalized);
  if (!stats.isDirectory()) {
    throw new WorkspacePathError(`workspace path "${normalized}" must be a directory`);
  }
  fs.accessSync(normalized, fsConstants.R_OK | fsConstants.W_OK);
  return normalized;
}

async function validateWorkspacePath(candidate: string): Promise<string> {
  assertAbsolutePath(candidate);
  const normalized = path.resolve(candidate);
  const stats = await stat(normalized);
  if (!stats.isDirectory()) {
    throw new WorkspacePathError(`workspace path "${normalized}" must be a directory`);
  }
  await access(normalized, fsConstants.R_OK | fsConstants.W_OK);
  return normalized;
}

export async function resolveWorkspacePath(requestPath?: string): Promise<{ path: string; source: WorkspacePathSource }> {
  const requested = requestPath?.trim();
  if (requested) {
    const validated = await validateWorkspacePath(requested);
    return { path: validated, source: 'request' };
  }

  const envPath = getConfiguredWorkspacePath();
  if (!envPath) {
    throw new WorkspacePathError('workspace path is required (set request path or CLAUDE_WS_PROJECT_PATH)');
  }

  const validated = await validateWorkspacePath(envPath);
  return { path: validated, source: 'env' };
}

export function validateWorkspaceConfigAtBoot(): void {
  const envPath = getConfiguredWorkspacePath();
  if (isLiteMode() && !envPath) {
    throw new WorkspacePathError('CLAUDE_WS_PROJECT_PATH is required when CLAUDE_WS_MODE=lite');
  }

  if (!envPath) return;
  validateWorkspacePathSync(envPath);
}

export function getProjectIdFromWorkspacePath(workspacePath: string): string {
  const digest = createHash('sha1').update(workspacePath).digest('hex').slice(0, 16);
  return `ws-${digest}`;
}

export function getProjectNameFromWorkspacePath(workspacePath: string): string {
  const name = path.basename(workspacePath).trim();
  return name || 'workspace';
}
