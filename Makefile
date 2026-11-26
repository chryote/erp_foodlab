.PHONY: help setup up down restart ps logs deploy migrate schema-dump seed scout-sync scout-import test test-backend test-filter test-frontend k6-smoke k6-load k6-stress

SCOUT_MODELS := ExpenseItem Item Packet Employee LabSample

help: ## Show available Make targets
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

setup: ## Copy environment files, start containers, migrate/seed DB, and initialize Meilisearch
	cp -n .env.example .env || true
	cp -n backend/.env.example backend/.env || true
	cp -n frontend/.env.example frontend/.env || true
	docker compose up -d --build -V --wait
	docker compose exec -T app php artisan key:generate
	$(MAKE) scout-sync
	docker compose exec -T app php artisan migrate --seed
	$(MAKE) scout-import

up: ## Start all Docker services in detached mode and sync Meilisearch settings
	docker compose up -d --build -V --wait
	$(MAKE) scout-sync

down: ## Stop and remove Docker containers
	docker compose down

restart: down up ## Restart all Docker services

ps: ## List running containers
	docker compose ps

logs: ## Follow container logs
	docker compose logs -f

deploy: ## Production/staging deploy: build/start containers, migrate, sync/import Scout, optimize caches, restart queue
	docker compose up -d --build --wait
	docker compose exec -T app php artisan migrate --force
	$(MAKE) scout-sync
	$(MAKE) scout-import
	docker compose exec -T app php artisan optimize
	docker compose exec -T app php artisan queue:restart

migrate: ## Run Laravel database migrations
	docker compose exec -T app php artisan migrate

schema-dump: ## Dump MySQL schema into database/schema/mysql-schema.sql
	docker compose exec app php artisan schema:dump

seed: ## Seed Laravel database with sample FoodLab data and refresh Meilisearch
	docker compose exec -T app php artisan db:seed
	$(MAKE) scout-sync
	$(MAKE) scout-import

scout-sync: ## Sync Meilisearch index settings from config/scout.php
	docker compose exec -T app php artisan scout:sync-index-settings

scout-import: ## Import all Searchable models into Meilisearch
	@for model in $(SCOUT_MODELS); do \
		docker compose exec -T app php artisan scout:import "$$model"; \
	done

test: test-backend test-frontend ## Run both Backend (Pest) and Frontend (Vitest) unit tests

test-backend: ## Run Laravel Pest PHP unit & feature tests
	docker compose exec app ./vendor/bin/pest

test-filter: ## Run filtered Pest tests (usage: make test-filter FILTER=ExpenseItemTest)
	docker compose exec app php artisan test --filter=$(FILTER)

test-frontend: ## Run React Vitest unit tests
	docker compose exec frontend npm run test:run

k6-smoke: ## Run k6 smoke benchmark
	docker compose --profile benchmark run --rm k6 run /scripts/smoke.test.js

k6-load: ## Run k6 load benchmark
	docker compose --profile benchmark run --rm k6 run /scripts/load.test.js

k6-stress: ## Run k6 stress benchmark
	docker compose --profile benchmark run --rm k6 run /scripts/stress.test.js
