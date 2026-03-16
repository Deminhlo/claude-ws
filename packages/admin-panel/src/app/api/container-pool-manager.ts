import Docker from 'dockerode';
import { promises as fs } from 'fs';
import path from 'path';

import { db } from '@/lib/db';
import { containerPool, projects, projectActivityLog } from '@/lib/schema/pool-management';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('ContainerPoolManager');

export interface PoolConfig {
  pool: {
    size: number;
    basePort: number;
    image: string;
  };
  storage: {
    basePath: string;
    poolTempBase: string;
  };
  healthCheck: {
    intervalSeconds: number;
    timeoutSeconds: number;
    retries: number;
  };
}

export interface AllocationResult {
  container_id: string;
  port: number;
  access_url: string;
}

export class ContainerPoolManager {
  private docker: Docker;
  private config: PoolConfig;

  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.config = this.loadConfig();
  }

  /**
   * Allocate container from pool to project
   */
  async allocateContainer(projectId: string, projectName: string): Promise<AllocationResult> {
    log.info(`Allocating container for project: ${projectId}`);

    // 1. Find idle container from pool
    const poolContainer = await db.query.containerPool.findFirst({
      where: eq(containerPool.status, 'idle'),
      orderBy: (containerPool, { asc }) => [containerPool.createdAt],
    });

    if (!poolContainer) {
      throw new Error('POOL_EXHAUSTED: No idle containers available in pool');
    }

    log.info(`Found idle container: ${poolContainer.containerId}`);

    // 2. Sanitize project name for filesystem
    const sanitizedName = this.sanitizeFilename(projectName);
    const dataPath = path.join(this.config.storage.basePath, `${projectId}-${sanitizedName}`);

    // 3. Create project data directory
    await fs.mkdir(dataPath, { recursive: true });
    await fs.mkdir(path.join(dataPath, 'files'), { recursive: true });
    await fs.mkdir(path.join(dataPath, 'checkpoints'), { recursive: true });

    log.info(`Created project data directory: ${dataPath}`);

    // 4. Stop and remove existing container
    try {
      const existingContainer = this.docker.getContainer(poolContainer.containerId);
      await existingContainer.stop();
      await existingContainer.remove();
    } catch (error) {
      log.warn(`Failed to stop existing container: ${error}`);
    }

    // 5. Start container with project data mounted
    const newContainer = await this.docker.createContainer({
      Image: this.config.pool.image,
      name: poolContainer.containerId,
      ExposedPorts: { '8053/tcp': {} },
      HostConfig: {
        PortBindings: { '8053/tcp': [{ HostPort: String(poolContainer.containerPort) }] },
        Binds: [`${dataPath}:/app/data`],
        RestartPolicy: { Name: 'unless-stopped' },
      },
      Env: [
        'NODE_ENV=production',
        'PORT=8053',
        'DATA_DIR=/app/data',
        `PROJECT_ID=${projectId}`,
        `PROJECT_NAME=${sanitizedName}`,
      ],
      Labels: {
        'claude-ws.project': projectId,
        'claude-ws.managed': 'true',
      },
    });

    await newContainer.start();

    log.info(`Started container ${poolContainer.containerId} with project data`);

    // 6. Update database
    await db.transaction(async (tx) => {
      await tx
        .update(projects)
        .set({
          container_id: poolContainer.containerId,
          container_port: poolContainer.containerPort,
          status: 'allocated',
          data_path: dataPath,
          last_activity_at: new Date(),
        })
        .where(eq(projects.id, projectId));

      await tx
        .update(containerPool)
        .set({
          status: 'allocated',
          project_id: projectId,
          allocated_at: new Date(),
        })
        .where(eq(containerPool.containerId, poolContainer.containerId));

      // Log activity
      await tx.insert(projectActivityLog).values({
        project_id: projectId,
        container_id: poolContainer.containerId,
        action: 'allocated',
        details: { data_path: dataPath, allocation_time_ms: Date.now() },
        performed_by: 'system',
      });
    });

    // 7. Trigger pool replenishment asynchronously
    this.replenishPool().catch((err) => {
      log.error(`Pool replenishment failed: ${err}`);
    });

    return {
      container_id: poolContainer.containerId,
      port: poolContainer.containerPort,
      access_url: `http://pool-${poolContainer.containerId.split('-')[2]}.claude-ws.local:${poolContainer.containerPort}`,
    };
  }

  /**
   * Release container back to pool
   */
  async releaseContainer(containerId: string, projectId: string): Promise<void> {
    log.info(`Releasing container ${containerId} back to pool`);

    // 1. Stop container
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: 10 }); // 10 second timeout
    } catch (error) {
      log.warn(`Failed to stop container ${containerId}: ${error}`);
    }

    // 2. Restart with temporary volume (pool mode)
    const tempMount = path.join(this.config.storage.poolTempBase, containerId);
    await fs.mkdir(tempMount, { recursive: true });

    try {
      const container = this.docker.getContainer(containerId);
      await container.remove();
    } catch (error) {
      log.warn(`Failed to remove container ${containerId}: ${error}`);
    }

    const newContainer = await this.docker.createContainer({
      Image: this.config.pool.image,
      name: containerId,
      ExposedPorts: { '8053/tcp': {} },
      HostConfig: {
        PortBindings: { '8053/tcp': [{ HostPort: String(this.getPortFromId(containerId)) }] },
        Binds: [`${tempMount}:/app/data`],
        RestartPolicy: { Name: 'unless-stopped' },
      },
      Env: [
        'NODE_ENV=production',
        'PORT=8053',
        'DATA_DIR=/app/data',
        'POOL_MODE=true',
      ],
      Labels: {
        'claude-ws.pool': 'true',
        'claude-ws.managed': 'true',
      },
    });

    await newContainer.start();

    log.info(`Restarted container ${containerId} in pool mode`);

    // 3. Update database
    await db.transaction(async (tx) => {
      await tx
        .update(projects)
        .set({
          status: 'stopped',
          stopped_at: new Date(),
        })
        .where(eq(projects.id, projectId));

      await tx
        .update(containerPool)
        .set({
          status: 'idle',
          project_id: null,
          allocated_at: null,
        })
        .where(eq(containerPool.containerId, containerId));

      // Log activity
      await tx.insert(projectActivityLog).values({
        project_id: projectId,
        container_id: containerId,
        action: 'stopped',
        details: { returned_to_pool: true },
        performed_by: 'system',
      });
    });
  }

  /**
   * Ensure pool has required number of idle containers
   */
  async replenishPool(): Promise<void> {
    const idleCount = await db.query.containerPool.count({
      where: eq(containerPool.status, 'idle'),
    });

    const needed = this.config.pool.size - idleCount;

    if (needed > 0) {
      log.info(`Replenishing pool: need ${needed} more containers`);
      for (let i = 0; i < needed; i++) {
        await this.createIdleContainer();
      }
      log.info('Pool replenished successfully');
    }
  }

  /**
   * Create new idle container for pool
   */
  private async createIdleContainer(): Promise<void> {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const containerId = `claude-ws-pool-${timestamp}-${randomStr}`;
    const port = await this.getNextAvailablePort();

    const tempMount = path.join(this.config.storage.poolTempBase, containerId);
    await fs.mkdir(tempMount, { recursive: true });

    const container = await this.docker.createContainer({
      Image: this.config.pool.image,
      name: containerId,
      ExposedPorts: { '8053/tcp': {} },
      HostConfig: {
        PortBindings: { '8053/tcp': [{ HostPort: String(port) }] },
        Binds: [`${tempMount}:/app/data`],
        RestartPolicy: { Name: 'unless-stopped' },
      },
      Env: ['NODE_ENV=production', 'PORT=8053', 'DATA_DIR=/app/data', 'POOL_MODE=true'],
      Labels: {
        'claude-ws.pool': 'true',
        'claude-ws.managed': 'true',
        'claude-ws.pool.created': new Date().toISOString(),
      },
    });

    await container.start();

    await db.insert(containerPool).values({
      containerId,
      status: 'idle',
      containerPort: port,
      projectId: null,
    });

    log.info(`Created idle container: ${containerId} on port ${port}`);
  }

  /**
   * Health check for all pool containers
   */
  async healthCheck(): Promise<void> {
    log.debug('Running health check for all containers');

    const containers = await db.query.containerPool.findMany();

    for (const container of containers) {
      try {
        const dockerContainer = this.docker.getContainer(container.containerId);
        const status = await dockerContainer.inspect();

        const isHealthy = status.State.Running && status.State.Health?.Status !== 'unhealthy';

        await db
          .update(containerPool)
          .set({
            healthStatus: isHealthy ? 'healthy' : 'unhealthy',
            lastHealthCheck: new Date(),
          })
          .where(eq(containerPool.containerId, container.containerId));

        if (!isHealthy && container.status === 'allocated') {
          log.warn(`Unhealthy allocated container detected: ${container.containerId}`);
        }
      } catch (error) {
        log.error(`Health check failed for ${container.containerId}: ${error}`);

        await db
          .update(containerPool)
          .set({
            healthStatus: 'error',
            errorMessage: String(error),
            lastHealthCheck: new Date(),
          })
          .where(eq(containerPool.containerId, container.containerId));
      }
    }
  }

  /**
   * Get next available port for pool container
   */
  private async getNextAvailablePort(): Promise<number> {
    const containers = await db.query.containerPool.findMany({
      orderBy: (containerPool, { desc }) => [containerPool.containerPort],
    });

    const usedPorts = new Set(containers.map((c) => c.containerPort));
    const basePort = this.config.pool.basePort;

    for (let i = 0; i < this.config.pool.size; i++) {
      const port = basePort + i;
      if (!usedPorts.has(port)) {
        return port;
      }
    }

    // If all pool ports are taken, find next available
    return basePort + containers.length;
  }

  private getPortFromId(containerId: string): number {
    const container = db.query.containerPool.findFirst({
      where: eq(containerPool.containerId, containerId),
    });

    return container?.containerPort || this.config.pool.basePort;
  }

  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  private loadConfig(): PoolConfig {
    return {
      pool: {
        size: parseInt(process.env.POOL_SIZE || '5'),
        basePort: parseInt(process.env.POOL_BASE_PORT || '8054'),
        image: process.env.POOL_IMAGE || 'claude-ws:latest',
      },
      storage: {
        basePath: process.env.DATA_BASE_PATH || '/srv/claude-ws/data/projects',
        poolTempBase: process.env.POOL_TEMP_BASE || '/srv/claude-ws/pool-temp',
      },
      healthCheck: {
        intervalSeconds: parseInt(process.env.HEALTH_CHECK_INTERVAL_SECONDS || '60'),
        timeoutSeconds: parseInt(process.env.HEALTH_CHECK_TIMEOUT_SECONDS || '10'),
        retries: parseInt(process.env.HEALTH_CHECK_RETRIES || '3'),
      },
    };
  }
}

// Singleton instance
export const containerPoolManager = new ContainerPoolManager();
