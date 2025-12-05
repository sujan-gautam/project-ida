# CI/CD Setup Guide

Complete guide to setting up CI/CD pipelines for the Data Analysis application.

## Quick Start

```bash
# 1. Copy environment templates
cp env.template .env
cp backend/env.template backend/.env
cp frontend/env.template frontend/.env

# 2. Edit .env files with your values
nano .env

# 3. Start development environment
make dev

# 4. Or start production environment
make build && make up
```

## GitHub Actions Setup

### 1. Repository Secrets

Go to GitHub Repository Settings > Secrets and variables > Actions, and add:

#### Required Secrets:

- `PRODUCTION_HOST`: Your production server IP/hostname
- `PRODUCTION_USER`: SSH username for production
- `PRODUCTION_SSH_KEY`: Private SSH key for production server
- `PRODUCTION_URL`: Production URL (e.g., `https://app.example.com`)
- `STAGING_HOST`: Staging server IP/hostname (optional)
- `STAGING_USER`: SSH username for staging (optional)
- `STAGING_SSH_KEY`: Private SSH key for staging (optional)
- `STAGING_URL`: Staging URL (optional)
- `SLACK_WEBHOOK`: Slack webhook URL for notifications (optional)

#### How to Generate SSH Key:

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_actions.pub user@your-server

# Copy private key content to GitHub Secrets
cat ~/.ssh/github_actions
# Copy the entire output to PRODUCTION_SSH_KEY secret
```

### 2. Container Registry Setup

The pipeline uses GitHub Container Registry (GHCR). It automatically:
- Builds Docker images
- Pushes to `ghcr.io/your-username/your-repo/backend`
- Pushes to `ghcr.io/your-username/your-repo/frontend`

No additional setup needed! The `GITHUB_TOKEN` is automatically available.

### 3. Workflow Files

Three workflow files are configured:

#### `.github/workflows/ci.yml`
- **Triggers**: On push/PR to `main` or `develop`
- **Jobs**:
  - Backend lint & build
  - Frontend lint & build
  - Docker build test
  - Security scanning

#### `.github/workflows/cd.yml`
- **Triggers**: On push to `main` or tag `v*`
- **Jobs**:
  - Build and push Docker images
  - Deploy to production
  - Deploy to staging (on `develop` branch)

#### `.github/workflows/docker-compose-test.yml`
- **Triggers**: On push/PR to `main` or `develop`
- **Jobs**:
  - Integration tests with Docker Compose
  - Health checks

### 4. Server Setup

On your production server:

```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create deployment directory
sudo mkdir -p /opt/data-analysis
cd /opt/data-analysis

# Clone repository
sudo git clone <your-repo-url> .

# Copy environment file
sudo cp env.template .env
sudo nano .env  # Edit with production values

# Setup SSH for GitHub Actions
# (Already done if you followed SSH key setup above)

# Set permissions
sudo chown -R $USER:$USER /opt/data-analysis
```

### 5. Deployment Script (on Server)

Create `/opt/data-analysis/deploy.sh`:

```bash
#!/bin/bash
set -e

cd /opt/data-analysis

# Pull latest changes
git pull origin main

# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# Pull latest images
docker compose pull

# Restart services
docker compose up -d --no-deps --build

# Clean up old images
docker image prune -f

echo "Deployment completed successfully!"
```

Make it executable:
```bash
chmod +x /opt/data-analysis/deploy.sh
```

## Deployment Flow

### Automatic Deployment

1. **Push to `main` branch:**
   ```
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **GitHub Actions automatically:**
   - Runs CI pipeline (lint, build, test)
   - Builds Docker images
   - Pushes images to registry
   - Deploys to production server
   - Runs health checks

### Manual Deployment

1. **Via GitHub Actions UI:**
   - Go to Actions tab
   - Select "CD Pipeline"
   - Click "Run workflow"
   - Choose environment (staging/production)

2. **Via SSH:**
   ```bash
   ssh user@your-server
   cd /opt/data-analysis
   ./deploy.sh
   ```

## Environment Configuration

### Local Development

```bash
# Copy templates
cp env.template .env
cp backend/env.template backend/.env
cp frontend/env.template frontend/.env

# Start development
make dev
```

### Staging Environment

```bash
# On staging server
cp env.template .env
# Edit .env with staging values
docker compose up -d
```

### Production Environment

```bash
# On production server
cp env.template .env
# Edit .env with production values
# Use strong passwords and secrets!
docker compose up -d
```

## Monitoring

### Check Deployment Status

```bash
# View GitHub Actions
# Go to: https://github.com/your-username/your-repo/actions

# View server logs
ssh user@your-server
cd /opt/data-analysis
docker compose logs -f
```

### Health Checks

```bash
# Backend health
curl http://your-domain.com/api/health

# Frontend health
curl http://your-domain.com/health
```

## Troubleshooting

### CI Pipeline Fails

1. **Check logs in GitHub Actions:**
   - Go to Actions tab
   - Click on failed workflow
   - Check individual job logs

2. **Common issues:**
   - Missing dependencies → Check package.json
   - TypeScript errors → Run `npm run build` locally
   - Docker build fails → Test locally with `docker build`

### CD Pipeline Fails

1. **SSH Connection Issues:**
   ```bash
   # Test SSH connection
   ssh -i ~/.ssh/github_actions user@your-server
   
   # Check SSH key format in GitHub Secrets
   # Should start with: -----BEGIN OPENSSH PRIVATE KEY-----
   ```

2. **Server Issues:**
   ```bash
   # Check Docker status
   docker ps
   
   # Check disk space
   df -h
   
   # Check logs
   docker compose logs
   ```

### Deployment Issues

1. **Services won't start:**
   ```bash
   # Check environment variables
   docker compose config
   
   # Check logs
   docker compose logs
   ```

2. **Port conflicts:**
   ```bash
   # Check what's using ports
   sudo netstat -tulpn | grep :5000
   sudo netstat -tulpn | grep :80
   ```

## Security Best Practices

1. **Never commit `.env` files**
   ```bash
   # Ensure .env is in .gitignore
   git check-ignore .env
   ```

2. **Use strong secrets:**
   ```bash
   # Generate secure JWT secret
   openssl rand -base64 32
   ```

3. **Rotate secrets regularly:**
   - JWT_SECRET: Every 90 days
   - Database passwords: Every 180 days

4. **Enable HTTPS:**
   - Use Let's Encrypt with Certbot
   - Configure reverse proxy (Nginx)

5. **Monitor for vulnerabilities:**
   - GitHub Actions runs Trivy security scanner
   - Review security alerts in GitHub

## Next Steps

1. ✅ Set up GitHub Secrets
2. ✅ Configure production server
3. ✅ Test deployment locally
4. ✅ Push to `main` and verify CI/CD
5. ✅ Monitor first production deployment
6. ✅ Set up alerts and monitoring
7. ✅ Configure backups
8. ✅ Enable HTTPS/TLS

## Support

For issues:
1. Check GitHub Actions logs
2. Check server logs: `docker compose logs`
3. Review DEPLOYMENT.md
4. Open GitHub Issue

