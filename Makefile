.PHONY: help setup up down restart ps logs test test-backend test-filter test-frontend k6-smoke k6-load k6-stress migrate schema-dump seed scout-sync scout-import

help: ## Show available Make targets
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

setup: ## Copy environment files and start all containers
	cp -n .env.example .env || true
	cp -n backend/.env.example backend/.env || true
	cp -n frontend/.env.example frontend/.env || true
	docker compose up -d --build -V --wait
	docker compose exec app php artisan key:generate
	docker compose exec app php artisan migrate --seed

up: ## Start all Docker services in detached mode
	docker compose up -d --build -V

down: ## Stop and remove Docker containers
	docker compose down

restart: down up ## Restart all Docker services

ps: ## List running containers
	docker compose ps

logs: ## Follow container logs
	docker compose logs -f

migrate: ## Run Laravel database migrations
	docker compose exec app php artisan migrate

schema-dump: ## Dump MySQL schema into database/schema/mysql-schema.sql
	docker compose exec app php artisan schema:dump

seed: ## Seed Laravel database with sample FoodLab data
	docker compose exec app php artisan db:seed

scout-sync: ## Sync Meilisearch index settings from config/scout.php
	docker compose exec app php artisan scout:sync-index-settings

scout-import: ## Import all Searchable models into Meilisearch
	docker compose exec app php artisan scout:import "App\Models\ExpenseItem"
	docker compose exec app php artisan scout:import "App\Models\Item"
	docker compose exec app php artisan scout:import "App\Models\Packet"
	docker compose exec app php artisan scout:import "App\Models\Employee"
	docker compose exec app php artisan scout:import "App\Models\LabSample"

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
