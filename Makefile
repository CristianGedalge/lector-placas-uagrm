# POR-002: Makefile — Interfaz unificada de comandos para lector-placas-uagrm
# Compatible con Linux, macOS y Windows (con Git Bash / WSL).
#
# Uso: make <target>
#   Ejemplo: make up        → levanta todos los servicios con Docker Compose
#            make test      → ejecuta los tests del backend
#            make migrate   → aplica migraciones Alembic
#            make lint      → corre ruff en el backend

.PHONY: help up down build restart logs test lint migrate makemigrations clean

# ── Ayuda ────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "Lector de Placas UAGRM — Comandos disponibles"
	@echo "────────────────────────────────────────────────"
	@echo "  make up            → Levanta backend + frontend + PostgreSQL (Docker)"
	@echo "  make down          → Detiene y elimina los contenedores"
	@echo "  make build         → Reconstruye las imágenes Docker"
	@echo "  make restart       → Reinicia todos los servicios"
	@echo "  make logs          → Muestra logs de todos los servicios"
	@echo "  make test          → Ejecuta los tests del backend (pytest)"
	@echo "  make lint          → Analiza el código con ruff"
	@echo "  make migrate       → Aplica las migraciones Alembic pendientes"
	@echo "  make makemigration MSG='descripcion' → Genera nueva migración"
	@echo "  make clean         → Elimina archivos temporales y __pycache__"
	@echo ""

# ── Docker Compose ────────────────────────────────────────────────────────────
up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

restart:
	docker compose down && docker compose up -d

logs:
	docker compose logs -f

# ── Backend local (sin Docker) ────────────────────────────────────────────────
dev-backend:
	cd backend && python run.py

dev-frontend:
	cd frontend && npm run dev

# ── Tests ─────────────────────────────────────────────────────────────────────
test:
	cd backend && python -m pytest tests/ -v --tb=short

test-cov:
	cd backend && python -m pytest tests/ -v --tb=short --cov=app --cov-report=term-missing

# ── Calidad de código ─────────────────────────────────────────────────────────
lint:
	cd backend && ruff check app/ tests/

lint-fix:
	cd backend && ruff check --fix app/ tests/

# ── Alembic / Migraciones ─────────────────────────────────────────────────────
migrate:
	cd backend && alembic upgrade head

makemigration:
	cd backend && alembic revision --autogenerate -m "$(MSG)"

migration-history:
	cd backend && alembic history --verbose

migration-current:
	cd backend && alembic current

# ── Limpieza ──────────────────────────────────────────────────────────────────
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@echo "Limpieza completa."
