# Deployment Guide

This guide covers deploying the Data Analysis application to production using Docker and CI/CD pipelines.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Production Deployment](#production-deployment)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Environment Variables](#environment-variables)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Node.js 20+ (for local development)
- MongoDB 7.0+ (or use Docker image)
- Git
- SSH access to production server (for deployment)

## Local Development

### Using Docker Compose

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd data-analysis
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development environment:**
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - MongoDB: localhost:27017

5. **Stop services:**
   ```bash
   docker compose -f docker-compose.dev.yml down
   ```

### Without Docker (Local Development)

1. **Backend Setup:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

## Production Deployment

### Option 1: Docker Compose (Recommended for VPS/Single Server)

1. **Prepare your server:**
   ```bash
   # Install Docker and Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   sudo usermod -aG docker $USER
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Clone repository:**
   ```bash
   cd /opt
   sudo git clone <repository-url> data-analysis
   cd data-analysis
   ```

3. **Configure environment:**
   ```bash
   sudo cp .env.example .env
   sudo nano .env  # Edit with production values
   ```

4. **Build and start:**
   ```bash
   sudo docker compose build
   sudo docker compose up -d
   ```

5. **Check status:**
   ```bash
   sudo docker compose ps
   sudo docker compose logs -f
   ```

6. **Setup reverse proxy (Nginx):**
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

### Option 2: Kubernetes (For Scalable Deployments)

See `k8s/` directory for Kubernetes manifests (to be created separately).

### Option 3: Cloud Platform (AWS, GCP, Azure)

1. **Build and push images:**
   ```bash
   docker build -t your-registry/data-analysis-backend:latest ./backend
   docker build -t your-registry/data-analysis-frontend:latest ./frontend
   docker push your-registry/data-analysis-backend:latest
   docker push your-registry/data-analysis-frontend:latest
   ```

2. **Use cloud-specific deployment tools:**
   - AWS: ECS, EKS, or App Runner
   - GCP: Cloud Run, GKE
   - Azure: Container Instances, AKS

## CI/CD Pipeline

### GitHub Actions Setup

1. **Required Secrets (GitHub Repository Settings > Secrets):**
   - `PRODUCTION_HOST`: Production server IP/hostname
   - `PRODUCTION_USER`: SSH username
   - `PRODUCTION_SSH_KEY`: SSH private key
   - `PRODUCTION_URL`: Production URL
   - `STAGING_HOST`: Staging server IP/hostname
   - `STAGING_USER`: SSH username
   - `STAGING_SSH_KEY`: SSH private key
   - `STAGING_URL`: Staging URL
   - `SLACK_WEBHOOK`: (Optional) Slack webhook for notifications

2. **Workflow Files:**
   - `.github/workflows/ci.yml`: Runs on every push/PR
   - `.github/workflows/cd.yml`: Deploys to production/staging
   - `.github/workflows/docker-compose-test.yml`: Integration tests

3. **Manual Deployment:**
   ```bash
   # Trigger deployment workflow from GitHub Actions tab
   # Or push to main branch for automatic deployment
   ```

### Deployment Process

1. **On push to `main`:**
   - CI pipeline runs (lint, build, test)
   - Docker images are built and pushed to registry
   - CD pipeline deploys to production
   - Health checks run automatically

2. **On push to `develop`:**
   - CI pipeline runs
   - Deploys to staging environment

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_ROOT_USERNAME` | MongoDB admin username | `admin` |
| `MONGO_ROOT_PASSWORD` | MongoDB admin password | `secure-password` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://...` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `VITE_API_URL` | Frontend API URL | `http://localhost:5000` |

### Security Best Practices

1. **Never commit `.env` files:**
   ```bash
   # Ensure .env is in .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use strong secrets:**
   ```bash
   # Generate secure JWT secret
   openssl rand -base64 32
   ```

3. **Rotate secrets regularly:**
   - JWT_SECRET: Every 90 days
   - Database passwords: Every 180 days

4. **Use secret management:**
   - Production: AWS Secrets Manager, HashiCorp Vault
   - Kubernetes: Secrets
   - Docker: Docker secrets

## Monitoring & Maintenance

### Health Checks

- Backend: `GET /api/health`
- Frontend: `GET /health`

### Logs

```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f backend
docker compose logs -f frontend

# Last 100 lines
docker compose logs --tail=100
```

### Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d

# Clean up old images
docker image prune -a
```

### Database Backups

```bash
# Backup MongoDB
docker compose exec mongodb mongodump --out /backup/$(date +%Y%m%d)

# Restore MongoDB
docker compose exec mongodb mongorestore /backup/20240101
```

### Monitoring Resources

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker compose logs

# Check container status
docker compose ps

# Rebuild from scratch
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### Database connection issues

```bash
# Test MongoDB connection
docker compose exec backend node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected'))"

# Check MongoDB logs
docker compose logs mongodb
```

### Frontend not loading

```bash
# Check nginx logs
docker compose logs frontend

# Test nginx config
docker compose exec frontend nginx -t

# Restart frontend
docker compose restart frontend
```

### Out of disk space

```bash
# Clean up Docker
docker system prune -a --volumes

# Remove old images
docker image prune -a
```

## Performance Optimization

1. **Enable Docker BuildKit:**
   ```bash
   export DOCKER_BUILDKIT=1
   ```

2. **Use multi-stage builds** (already configured)

3. **Enable image caching** (CI/CD configured)

4. **Monitor resource usage:**
   ```bash
   docker stats
   ```

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Database backups enabled
- [ ] Log rotation configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Environment variables secured

## Support

For issues or questions:
- Check logs: `docker compose logs`
- Review GitHub Issues
- Contact DevOps team

