import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Pool Projects table
export const poolProjects = sqliteTable('pool_projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  containerId: text('container_id').unique(),
  containerPort: integer('container_port'),
  status: text('status').notNull().default('allocated'),
  dataPath: text('data_path').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }).notNull(),
  stoppedAt: integer('stopped_at', { mode: 'timestamp' }),
  idleTimeoutSeconds: integer('idle_timeout_seconds').default(86400),
  memoryLimit: text('memory_limit'),
  cpuLimit: text('cpu_limit'),
});

// Container Pool table
export const containerPool = sqliteTable('container_pool', {
  id: text('id').primaryKey(),
  containerId: text('container_id').notNull().unique(),
  status: text('status').notNull().default('idle'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }),
});

// Project Activity Log table
export const poolProjectActivityLog = sqliteTable('pool_project_activity_log', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  action: text('action').notNull(),
  details: text('details'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});
