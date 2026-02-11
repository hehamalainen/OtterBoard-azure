# OtterBoard Azure: Implementation Plan

## Goal
Deliver an Azure-hosted twin of OtterBoard for demos while keeping feature parity with the Firebase version.

## Architecture Overview
- Frontend: React + Vite (`App.tsx`, `components/`)
- Hosting/Auth: Azure Static Web Apps with Entra ID (`/.auth/login/aad`)
- API: Azure Functions in `/api` (`boards`, `board`, `board-share`, `chat`, `analyze`, `action-plan`, `reframe`, `generate-image`, `generate-video`)
- Data: Cosmos DB (`boards` container)
- AI: Azure OpenAI via Functions (chat/vision/image)

## Data Model (Cosmos DB)
- `boards` container fields:
  - `id`, `title`, `owner`, `collaborators`, `result`, `updatedAt` (ISO string)

## Sync Strategy
- Frontend polls the Azure API for board updates (upgradeable to SignalR).

## Config & Secrets
- Azure Functions settings (see `api/local.settings.example.json`):
  - `COSMOS_CONNECTION_STRING`, `COSMOS_DATABASE_ID`, `COSMOS_CONTAINER_ID`
  - `AZURE_OPENAI_*`
- Static Web Apps auth (see `staticwebapp.config.json`):
  - `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, tenant `openIdIssuer`

## Migration
- Script: `scripts/migrate-firestore-to-cosmos.cjs`
- Command: `npm run migrate:firestore-to-cosmos` (see README for env vars)

## Build & Deploy
- Build: `npm run build`
- Deploy: Azure Static Web Apps with `/dist` and `/api`
