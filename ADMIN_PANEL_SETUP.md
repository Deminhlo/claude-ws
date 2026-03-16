# Admin Panel - Tách Riêng Service

## ✅ Hoàn thành

Đã tách Admin Panel thành một service riêng biệt hoàn toàn.

## 📁 Cấu trúc thư mục

```
claude-ws/
├── packages/
│   ├── admin-panel/              # 🆕 SEPARATE SERVICE
│   │   ├── src/
│   │   │   ├── app/             # Next.js App Router
│   │   │   │   ├── admin/       # Admin UI pages
│   │   │   │   ├── api/         # API routes
│   │   │   │   │   ├── health/  # Health check endpoint
│   │   │   │   │   └── admin/   # Admin API endpoints
│   │   │   │   ├── globals.css  # Global styles
│   │   │   │   └── layout.tsx   # Root layout
│   │   │   ├── components/      # React components
│   │   │   │   └── admin/       # Admin components
│   │   │   ├── lib/             # Utilities
│   │   │   │   ├── container-pool-manager.ts
│   │   │   │   └── utils.ts
│   │   │   ├── db/              # Database setup
│   │   │   │   └── index.ts
│   │   │   ├── schemas/         # Database schemas
│   │   │   │   └── pool-management.ts
│   │   │   ├── scripts/         # Cron scripts
│   │   │   │   ├── cron-check-idle-projects.ts
│   │   │   │   ├── cron-health-check.ts
│   │   │   │   └── cron-replenish-pool.ts
│   │   │   └── server.ts        # Express server
│   │   ├── drizzle/             # SQL migrations
│   │   ├── Dockerfile           # Docker image
│   │   ├── package.json         # Dependencies riêng
│   │   ├── .env.example         # Environment template
│   │   ├── .gitignore
│   │   ├── tailwind.config.ts   # Tailwind config
│   │   ├── postcss.config.mjs   # PostCSS config
│   │   ├── components.json      # shadcn/ui config
│   │   ├── next.config.ts       # Next.js config
│   │   ├── tsconfig.json        # TypeScript config
│   │   ├── healthcheck.sh       # Health check script
│   │   ├── README.md            # Documentation
│   │   └── INSTALL.md           # Installation guide
│   └── agentic-sdk/             # Main application
├── docker-compose.yml           # Cấu hình cả 2 services
├── setup-admin.sh               # Setup script cho admin panel
└── Dockerfile                   # Docker file cho main app
```

## 🚀 Cách sử dụng

### 1. Development (Local)

**Chạy Admin Panel riêng:**
```bash
cd packages/admin-panel
pnpm install
pnpm dev  # Chạy trên port 3001
```

**Chạy Main App:**
```bash
cd /home/roxane/github/claude-ws
pnpm agentic-sdk:dev  # Chạy trên port 8053
```

### 2. Production (Docker)

**Chạy cả 2 services:**
```bash
docker-compose up -d
```

**Chỉ chạy Admin Panel:**
```bash
docker-compose up admin-panel
```

**Chỉ chạy Main App:**
```bash
docker-compose up claude-ws
```

## 🔗 URLs

| Service | URL |
|---------|-----|
| **Admin Panel UI** | http://localhost:3001/admin |
| **Admin API** | http://localhost:3001/api/admin/* |
| **Health Check** | http://localhost:3001/api/health |
| **Main App** | http://localhost:8053 |

## 📦 Scripts

**Admin Panel:**
```bash
cd packages/admin-panel
pnpm dev              # Development (port 3001)
pnpm build            # Build for production
pnpm start            # Production server
pnpm db:generate      # Generate DB migrations
pnpm db:migrate       # Run migrations
```

**Main App:**
```bash
cd /home/roxane/github/claude-ws
pnpm agentic-sdk:dev  # Development (port 8053)
pnpm build            # Build for production
pnpm start            # Production server
```

## 🐳 Docker Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f admin-panel
docker-compose logs -f claude-ws

# Stop services
docker-compose down

# Restart services
docker-compose restart admin-panel
docker-compose restart claude-ws
```

## 🔑 Environment Variables

**Admin Panel** (`packages/admin-panel/.env`):
```bash
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
API_ACCESS_KEY=your-secret-key
DATABASE_PATH=./data/admin.db
DOCKER_SOCKET_PATH=/var/run/docker.sock
POOL_SIZE=5
IDLE_TIMEOUT_SECONDS=86400
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Main App** (`.env`):
```bash
NODE_ENV=production
PORT=8053
CLAUDE_WS_USER_CWD=/app
API_ACCESS_KEY=your-secret-key
```

## 📝 API Endpoints

### Admin Panel API

**Authentication** (x-api-key header required):
```bash
GET    /api/admin/dashboard           # Dashboard summary
GET    /api/admin/projects            # List projects
POST   /api/admin/projects            # Create project
GET    /api/admin/projects/:id        # Get project details
DELETE /api/admin/projects/:id        # Delete project
POST   /api/admin/projects/:id/stop   # Stop project
```

**Health Check** (no auth):
```bash
GET /api/health
```

## 🎨 UI Features

- ✅ Glassmorphism design với backdrop blur
- ✅ Pool status cards với gradients
- ✅ Real-time project status updates
- ✅ Container management interface
- ✅ Activity logs viewer
- ✅ Responsive design

## 📚 Documentation

- **Admin Panel README**: `packages/admin-panel/README.md`
- **Installation Guide**: `packages/admin-panel/INSTALL.md`
- **Setup Script**: `./setup-admin.sh`

## 🔧 Troubleshooting

### Port conflict
```bash
lsof -i :3001  # Check what's using port 3001
kill -9 <PID>  # Kill the process
```

### Database error
```bash
rm packages/admin-panel/data/admin.db
cd packages/admin-panel && pnpm dev
```

### Docker permission
```bash
sudo usermod -aG docker $USER
# Logout và login lại
```

### View logs
```bash
# Docker logs
docker-compose logs -f admin-panel

# Local logs
cd packages/admin-panel && pnpm dev
```

## ✨ Benefits của việc tách riêng

1. **Isolation** - Admin panel và main app chạy độc lập
2. **Scalability** - Scale từng service riêng
3. **Deployment** - Deploy từng service riêng
4. **Maintenance** - Update/maintenance không ảnh hưởng nhau
5. **Security** - Admin panel có thể deploy riêng với security layer riêng
6. **Development** - Developer có thể làm việc trên 2 service cùng lúc

## 🚀 Next Steps

1. Setup environment variables cho từng service
2. Build Docker images: `docker-compose build`
3. Start services: `docker-compose up -d`
4. Test Admin Panel: http://localhost:3001/admin
5. Test Main App: http://localhost:8053
