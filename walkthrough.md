# Walkthrough

## Setup
1. `npm install`
2. `cd api && npm install && cd ..`

## Local Functions Settings
1. Copy `api/local.settings.example.json` to `api/local.settings.json`.
2. Fill in Cosmos DB and Azure OpenAI values.

## Local Dev (Recommended)
1. Start Vite: `npm run dev`
2. Start SWA: `swa start http://localhost:5173 --api-location api`
3. Visit the app and log in via `/.auth/login/aad`.
   - Expected: API routes under `/api/*` require authentication.

## Build Verification
1. `npm run build`
2. Expected: `dist/` contains `index.html` and bundled assets.

## Migration Smoke-Test
1. Run:
   ```
   FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccount.json \
   COSMOS_CONNECTION_STRING="AccountEndpoint=...;AccountKey=..." \
   npm run migrate:firestore-to-cosmos
   ```
2. Expected: Boards appear in the Cosmos DB `boards` container.
