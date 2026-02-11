<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# OtterBoard (Azure)

This Azure version runs on Azure Static Web Apps + Azure Functions, using Entra ID (Azure AD) for auth, Cosmos DB for storage, and Azure OpenAI for analysis.

## Prerequisites
- Node.js
- Azure Static Web Apps CLI (optional for local auth simulation)
- Azure OpenAI resource + deployments
- Azure Cosmos DB account + container

## Local Development
1. Install frontend dependencies: `npm install`
2. Install API dependencies: `cd api && npm install`
3. Run the app (frontend): `npm run dev`
4. (Recommended) Run SWA locally for auth + API: `swa start http://localhost:5173 --api-location api`

## Environment Variables (Azure Functions)
Set these in the Functions app (or local.settings.json if you use it locally):
- `COSMOS_CONNECTION_STRING`
- `COSMOS_DATABASE_ID` (default: `boards`)
- `COSMOS_CONTAINER_ID` (default: `boards`)
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_VERSION` (default: `2024-06-01`)
- `AZURE_OPENAI_CHAT_DEPLOYMENT`
- `AZURE_OPENAI_VISION_DEPLOYMENT` (optional; defaults to chat deployment)
- `AZURE_OPENAI_IMAGE_DEPLOYMENT` (optional; required for image generation)
- `AZURE_OPENAI_IMAGE_API_VERSION` (optional)

## Entra ID Auth (Static Web Apps)
Configure `AZURE_AD_CLIENT_ID` and `AZURE_AD_CLIENT_SECRET` in Static Web Apps settings.  
The frontend uses `/.auth/login/aad` by default; override with `VITE_AUTH_PROVIDER` if needed.
Update `staticwebapp.config.json` with your Entra tenant ID in the `openIdIssuer` URL.

## Firestore → Cosmos DB Migration
Run:
```
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccount.json \
COSMOS_CONNECTION_STRING="AccountEndpoint=...;AccountKey=..." \
npm run migrate:firestore-to-cosmos
```

Optional env vars:
- `FIREBASE_PROJECT_ID`
- `FIRESTORE_COLLECTION` (default: `boards`)
- `COSMOS_DATABASE_ID`
- `COSMOS_CONTAINER_ID`

## Documentation
- `implementation_plan.md`: Azure architecture and decisions
- `task.md`: Current work checklist
- `walkthrough.md`: Verification steps
