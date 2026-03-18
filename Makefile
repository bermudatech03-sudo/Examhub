.PHONY: up down dev build seed logs clean restart status

# ============================================================
# ExamHub — Makefile
# ============================================================

# Start all services
up:
	docker compose up -d
	@echo "✅ ExamHub is running"
	@echo "   Frontend:  http://localhost:3000"
	@echo "   Backend:   http://localhost:4000/graphql"
	@echo "   MinIO:     http://localhost:9001"

# Stop all services
down:
	docker compose down

# Development mode (with logs)
dev:
	docker compose up

# Build images
build:
	docker compose build --no-cache

# Seed the database
seed:
	docker compose exec backend npm run db:seed

# View logs
logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

# Clean everything (including volumes)
clean:
	docker compose down -v --remove-orphans
	docker system prune -f

# Restart a service
restart-backend:
	docker compose restart backend

restart-frontend:
	docker compose restart frontend

# Status
status:
	docker compose ps

# Run DB migrations
migrate:
	docker compose exec backend npx prisma migrate deploy

# Open Prisma Studio
studio:
	docker compose exec backend npx prisma studio

# Local dev setup (without Docker)
local-install:
	cd backend && npm install
	cd frontend && npm install

local-dev-backend:
	cd backend && npm run dev

local-dev-frontend:
	cd frontend && npm run dev

# Generate self-signed SSL cert for development
ssl-gen:
	mkdir -p infrastructure/nginx/ssl
	openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout infrastructure/nginx/ssl/key.pem \
		-out infrastructure/nginx/ssl/cert.pem \
		-subj "/C=US/ST=Dev/L=Dev/O=ExamHub/CN=localhost"
	@echo "✅ Self-signed certificate generated"

# Create MinIO bucket
minio-setup:
	docker compose exec minio mc alias set local http://localhost:9000 \
		$${MINIO_ROOT_USER:-examhub} $${MINIO_ROOT_PASSWORD:-examhub_minio_secret}
	docker compose exec minio mc mb local/$${S3_BUCKET:-examhub} --ignore-existing
	docker compose exec minio mc anonymous set download local/$${S3_BUCKET:-examhub}/certificates
	@echo "✅ MinIO bucket created"
