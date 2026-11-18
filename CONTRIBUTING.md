# Contributing to erp_foodlab

Thank you for your interest in contributing to `erp_foodlab`!

## Development Workflow

1. Fork and clone the repository.
2. Copy `.env.example` to `.env`, `backend/.env.example` to `backend/.env`, and `frontend/.env.example` to `frontend/.env`.
3. Start the stack with `docker compose up -d --build`.
4. Create a feature branch (`git checkout -b feat/your-feature`).
5. Ensure all backend (Pest PHP) and frontend (Vitest) unit tests pass before submitting a Pull Request.

## Running Quality Checks

```bash
# Backend Pest PHP tests
docker compose exec app ./vendor/bin/pest

# Frontend Vitest unit tests
docker compose exec frontend npm run test:run

# k6 Smoke test
docker compose --profile benchmark run --rm k6 run /scripts/smoke.test.js
```

## Pull Request Guidelines

- Follow PSR-12 coding standards for PHP/Laravel code.
- Use TypeScript and functional components with hooks for React code.
- Include unit or feature tests for all new endpoints and UI components.
- Keep commits atomic and follow Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
