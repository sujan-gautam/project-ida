# Quick Start Guide

Get your Data Analysis application up and running in 5 minutes!

## 🚀 Local Development (5 minutes)

### 1. Setup Environment

```bash
# Copy environment templates
cp env.template .env
cp backend/env.template backend/.env
cp frontend/env.template frontend/.env

# Edit .env files with your configuration
nano .env
```

### 2. Start with Docker Compose

```bash
# Start development environment
make dev

# Or manually:
docker compose -f docker-compose.dev.yml up --build
```

### 3. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: localhost:27017

### 4. Stop Services

```bash
# Stop development environment
make dev-down

# Or manually:
docker compose -f docker-compose.dev.yml down
```

## 📦 Production Deployment (10 minutes)

### 1. Server Setup

```bash
# Install Docker (on server)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Deploy Application

```bash
# Clone repository
cd /opt
sudo git clone <your-repo-url> data-analysis
cd data-analysis

# Configure environment
sudo cp env.template .env
sudo nano .env  # Edit with production values

# Start services
sudo docker compose build
sudo docker compose up -d

# Check status
sudo docker compose ps
sudo docker compose logs -f
```

### 3. Setup Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔄 CI/CD Pipeline Setup (15 minutes)

### 1. GitHub Secrets

Go to **Repository Settings > Secrets and variables > Actions**, add:

- `PRODUCTION_HOST`: Your server IP
- `PRODUCTION_USER`: SSH username
- `PRODUCTION_SSH_KEY`: Private SSH key
- `PRODUCTION_URL`: Your domain URL

### 2. Generate SSH Key

```bash
# On local machine
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_actions.pub user@your-server

# Copy private key to GitHub Secrets
cat ~/.ssh/github_actions
```

### 3. Server Deployment Script

On your server (`/opt/data-analysis/deploy.sh`):

```bash
#!/bin/bash
cd /opt/data-analysis
git pull origin main
docker compose pull
docker compose up -d --no-deps --build
docker image prune -f
```

Make executable:
```bash
chmod +x /opt/data-analysis/deploy.sh
```

### 4. Deploy Automatically

```bash
# Just push to main!
git push origin main
```

GitHub Actions will:
1. ✅ Run tests
2. ✅ Build Docker images
3. ✅ Push to registry
4. ✅ Deploy to production
5. ✅ Run health checks

## 📋 Common Commands

### Docker Compose

```bash
# Build images
make build

# Start services
make up

# Stop services
make down

# View logs
make logs

# Restart services
make restart

# Clean up
make clean
```

### Development

```bash
# Start dev environment
make dev

# Stop dev environment
make dev-down

# Open backend shell
make backend-shell

# Open MongoDB shell
make db-shell
```

### Health Checks

```bash
# Check all services
make health

# Check backend
curl http://localhost:5000/api/health

# Check frontend
curl http://localhost/health
```

### Database

```bash
# Backup database
make backup-db

# Restore database
make restore-db BACKUP=20240101_120000
```

## 🔧 Configuration

### Required Environment Variables

Edit `.env` file:

```bash
# MongoDB
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=secure-password
MONGO_DATABASE=data-analysis

# Backend
JWT_SECRET=your-secret-key-here
GEMINI_API_KEY=your-api-key-here

# Frontend
VITE_API_URL=http://localhost:5000
```

### Generate Secure Secrets

```bash
# JWT Secret
openssl rand -base64 32

# MongoDB Password
openssl rand -base64 24
```

## 📚 Documentation

- **Full Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **CI/CD Setup**: [CI_CD_SETUP.md](./CI_CD_SETUP.md)
- **Docker Compose**: `docker-compose.yml`

## 🐛 Troubleshooting

### Services won't start

```bash
# Check logs
docker compose logs

# Check status
docker compose ps

# Rebuild
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### Port conflicts

```bash
# Check what's using ports
sudo netstat -tulpn | grep :5000
sudo netstat -tulpn | grep :80

# Change ports in .env
BACKEND_PORT=5001
FRONTEND_PORT=8080
```

### Database connection issues

```bash
# Check MongoDB logs
docker compose logs mongodb

# Test connection
docker compose exec backend node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected'))"
```

## ✅ Checklist

- [ ] Environment files configured
- [ ] Docker installed
- [ ] Services running locally
- [ ] GitHub Secrets configured
- [ ] Server setup complete
- [ ] Production deployment successful
- [ ] CI/CD pipeline working
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backups enabled

## 🆘 Need Help?

1. Check logs: `docker compose logs`
2. Review [DEPLOYMENT.md](./DEPLOYMENT.md)
3. Review [CI_CD_SETUP.md](./CI_CD_SETUP.md)
4. Open GitHub Issue

## 🎉 You're Ready!

Your application is now production-ready with:
- ✅ Docker containerization
- ✅ CI/CD pipelines
- ✅ Automated deployments
- ✅ Health checks
- ✅ Security best practices
- ✅ Monitoring setup

Happy deploying! 🚀

