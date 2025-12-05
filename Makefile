.PHONY: help build up down restart logs clean test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## Build Docker images
	docker compose build

up: ## Start services
	docker compose up -d

down: ## Stop services
	docker compose down

restart: ## Restart services
	docker compose restart

logs: ## View logs
	docker compose logs -f

clean: ## Clean up containers and volumes
	docker compose down -v
	docker system prune -f

dev: ## Start development environment
	docker compose -f docker-compose.dev.yml up

dev-down: ## Stop development environment
	docker compose -f docker-compose.dev.yml down

test: ## Run tests
	docker compose -f docker-compose.test.yml up --abort-on-container-exit

backend-shell: ## Open shell in backend container
	docker compose exec backend sh

frontend-shell: ## Open shell in frontend container
	docker compose exec frontend sh

db-shell: ## Open MongoDB shell
	docker compose exec mongodb mongosh

backup-db: ## Backup database
	docker compose exec mongodb mongodump --out /backup/$$(date +%Y%m%d_%H%M%S)

restore-db: ## Restore database (usage: make restore-db BACKUP=20240101_120000)
	docker compose exec mongodb mongorestore /backup/$(BACKUP)

stats: ## Show container stats
	docker stats

health: ## Check service health
	@echo "Checking backend health..."
	@curl -f http://localhost:5000/api/health || echo "Backend unhealthy"
	@echo "Checking frontend health..."
	@curl -f http://localhost/health || echo "Frontend unhealthy"

