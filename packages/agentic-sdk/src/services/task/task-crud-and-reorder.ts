/**
 * Task CRUD service - list, get, create, update, delete, reorder tasks and fetch attempt/conversation data
 */
import { eq, and, desc, inArray, asc, lt } from 'drizzle-orm';
import * as schema from '../../db/database-schema';
import { generateId } from '../../lib/nanoid-id-generator';

export function createTaskService(db: any) {
  return {
    async list(options?: { projectId?: string; projectIds?: string[]; statuses?: string[] }) {
      const conditions: any[] = [];

      // Support both single projectId (backward compat) and multiple projectIds
      if (options?.projectIds && options.projectIds.length > 0) {
        conditions.push(inArray(schema.tasks.projectId, options.projectIds));
      } else if (options?.projectId) {
        conditions.push(eq(schema.tasks.projectId, options.projectId));
      }

      if (options?.statuses && options.statuses.length > 0) {
        conditions.push(inArray(schema.tasks.status, options.statuses as any[]));
      }

      const query = db.select().from(schema.tasks);
      const filtered = conditions.length > 0
        ? query.where(conditions.length === 1 ? conditions[0] : and(...conditions))
        : query;

      return filtered.orderBy(schema.tasks.status, schema.tasks.position).all();
    },

    async getById(id: string) {
      return db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
    },

    async create(data: { projectId: string; title: string; description?: string; status?: string }) {
      const status = data.status || 'todo';
      // Get highest position for this status in this project
      const existing = await db.select().from(schema.tasks)
        .where(and(eq(schema.tasks.projectId, data.projectId), eq(schema.tasks.status, status as any)))
        .orderBy(desc(schema.tasks.position))
        .limit(1);
      const position = existing.length > 0 ? existing[0].position + 1 : 0;

      const id = generateId('task');
      const now = Date.now();
      const task = {
        id,
        projectId: data.projectId,
        title: data.title,
        description: data.description || null,
        status: status as any,
        position,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(schema.tasks).values(task);
      return task;
    },

    async update(id: string, data: Partial<schema.Task>) {
      const updates = { ...data, updatedAt: Date.now() };
      await db.update(schema.tasks).set(updates).where(eq(schema.tasks.id, id));
      return db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
    },

    async remove(id: string) {
      await db.delete(schema.tasks).where(eq(schema.tasks.id, id));
    },

    async reorder(taskId: string, newPosition: number, newStatus?: string) {
      const updates: any = { position: newPosition, updatedAt: Date.now() };
      if (newStatus) updates.status = newStatus;
      await db.update(schema.tasks).set(updates).where(eq(schema.tasks.id, taskId));
      return db.select().from(schema.tasks).where(eq(schema.tasks.id, taskId)).get();
    },

    async getAttempts(taskId: string) {
      return db.select().from(schema.attempts)
        .where(eq(schema.attempts.taskId, taskId))
        .orderBy(desc(schema.attempts.createdAt))
        .all();
    },

    async listFiltered(opts?: { projectId?: string; projectIds?: string[]; statuses?: string[] }) {
      const conditions: any[] = [];
      if (opts?.projectIds?.length) {
        conditions.push(inArray(schema.tasks.projectId, opts.projectIds));
      } else if (opts?.projectId) {
        conditions.push(eq(schema.tasks.projectId, opts.projectId));
      }
      if (opts?.statuses?.length) {
        conditions.push(inArray(schema.tasks.status, opts.statuses as any[]));
      }
      const whereClause = conditions.length > 0
        ? conditions.length === 1 ? conditions[0] : and(...conditions)
        : undefined;
      return db.select().from(schema.tasks)
        .where(whereClause)
        .orderBy(schema.tasks.status, schema.tasks.position)
        .all();
    },

    async getAttemptsAsc(taskId: string) {
      return db.select().from(schema.attempts)
        .where(eq(schema.attempts.taskId, taskId))
        .orderBy(schema.attempts.createdAt)
        .all();
    },

    async getConversation(taskId: string) {
      const attempts = await db.select().from(schema.attempts)
        .where(eq(schema.attempts.taskId, taskId))
        .orderBy(desc(schema.attempts.createdAt))
        .limit(1);
      if (!attempts.length) return [];
      const attemptId = attempts[0].id;
      return db.select().from(schema.attemptLogs)
        .where(eq(schema.attemptLogs.attemptId, attemptId))
        .orderBy(schema.attemptLogs.createdAt)
        .all();
    },

    /** Get the most recent running attempt with parsed JSON messages (cleans up stale >24h attempts) */
    async getRunningAttempt(taskId: string) {
      const runningAttempts = await db.select().from(schema.attempts)
        .where(and(
          eq(schema.attempts.taskId, taskId),
          eq(schema.attempts.status, 'running')
        ))
        .orderBy(desc(schema.attempts.createdAt))
        .limit(1)
        .all();

      const runningAttempt = runningAttempts[0] || null;

      // Clean up stale 'running' attempts older than 24 hours
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      await db.update(schema.attempts)
        .set({ status: 'failed', completedAt: Date.now() })
        .where(and(
          eq(schema.attempts.taskId, taskId),
          eq(schema.attempts.status, 'running'),
          lt(schema.attempts.createdAt, oneDayAgo)
        ));

      if (!runningAttempt || runningAttempt.createdAt < oneDayAgo) {
        return { attempt: null, messages: [] };
      }

      const logs = await db.select().from(schema.attemptLogs)
        .where(eq(schema.attemptLogs.attemptId, runningAttempt.id))
        .orderBy(asc(schema.attemptLogs.createdAt))
        .all();

      const messages: any[] = [];
      for (const log of logs) {
        if (log.type === 'json') {
          try {
            const parsed = JSON.parse(log.content);
            if (parsed.type !== 'system') messages.push(parsed);
          } catch { /* skip invalid JSON */ }
        }
      }

      return {
        attempt: {
          id: runningAttempt.id,
          prompt: runningAttempt.displayPrompt || runningAttempt.prompt,
          status: runningAttempt.status,
        },
        messages,
      };
    },

    /** Aggregate token/cost/diff stats across all attempts for a task */
    async getStats(taskId: string) {
      const attempts = await db.select().from(schema.attempts)
        .where(eq(schema.attempts.taskId, taskId))
        .orderBy(desc(schema.attempts.createdAt))
        .all();

      let totalTokens = 0, totalCostUSD = 0, totalTurns = 0, totalDurationMs = 0;
      let totalAdditions = 0, totalDeletions = 0, filesChanged = 0;

      const latestAttempt = attempts[0];
      let contextUsed = latestAttempt?.contextUsed || 0;
      let contextLimit = latestAttempt?.contextLimit || 200000;
      let contextPercentage = latestAttempt?.contextPercentage || 0;

      // Fallback to previous attempt if current is running with no context data
      if (latestAttempt?.status === 'running' && contextPercentage === 0 && attempts.length > 1) {
        const prev = attempts[1];
        if (prev?.contextPercentage && prev.contextPercentage > 0) {
          contextUsed = prev.contextUsed || 0;
          contextLimit = prev.contextLimit || 200000;
          contextPercentage = prev.contextPercentage;
        }
      }

      const utilization = contextUsed / contextLimit;
      const utilizationPercent = utilization * 100;
      let status: string, score: number;
      if (utilization < 0.60) { status = 'HEALTHY'; score = 1.0; }
      else if (utilization < 0.75) { status = 'WARNING'; score = 0.8; }
      else if (utilization < 0.90) { status = 'CRITICAL'; score = 0.5; }
      else { status = 'EMERGENCY'; score = 0.2; }
      const compactThreshold = contextLimit >= 1_000_000
        ? Math.floor(contextLimit * 0.33)
        : Math.floor(contextLimit * 0.75);
      const shouldCompact = contextUsed >= compactThreshold;
      const contextHealth = { status, score, utilizationPercent, shouldCompact, compactThreshold };

      for (const attempt of attempts) {
        totalTokens += attempt.totalTokens || 0;
        totalCostUSD += parseFloat(attempt.totalCostUSD || '0');
        totalTurns += attempt.numTurns || 0;
        totalDurationMs += attempt.durationMs || 0;
        totalAdditions += attempt.diffAdditions || 0;
        totalDeletions += attempt.diffDeletions || 0;
        if ((attempt.diffAdditions || 0) > 0 || (attempt.diffDeletions || 0) > 0) filesChanged++;
      }

      return {
        totalTokens, totalCostUSD, totalTurns, totalDurationMs,
        totalAdditions, totalDeletions, filesChanged,
        contextUsed, contextLimit, contextPercentage, contextHealth,
        attemptCount: attempts.length,
        lastUpdatedAt: attempts[0]?.completedAt || Date.now(),
      };
    },
  };
}
