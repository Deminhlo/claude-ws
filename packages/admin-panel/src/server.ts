import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import next from 'next';
import { createServer } from 'http';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
config({ path: envPath });

// Clean lock file on startup
const lockPath = join(__dirname, '..', '.next', 'dev', 'lock');
if (existsSync(lockPath)) {
  try {
    unlinkSync(lockPath);
    console.log('✅ Cleaned old lock file');
  } catch (err) {
    console.log('⚠️  Could not remove lock file:', err);
  }
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3001', 10);

console.log(`📝 Loading env from: ${envPath}`);
console.log(`🔧 PORT=${port}, HOST=${hostname}, NODE_ENV=${process.env.NODE_ENV}`);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let server: ReturnType<typeof createServer>;

const cleanup = () => {
  console.log('🧹 Cleaning up...');
  if (server) {
    server.close();
  }
  // Clean lock file
  if (existsSync(lockPath)) {
    try {
      unlinkSync(lockPath);
      console.log('✅ Cleaned lock file');
    } catch (err) {
      // Ignore
    }
  }
};

app.prepare().then(() => {
  server = createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  server.listen(port, hostname, () => {
    console.log(`🚀 Admin Panel starting on http://${hostname}:${port}`);
    console.log(`✅ Admin Panel ready on http://${hostname}:${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    cleanup();
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    cleanup();
  });
});
