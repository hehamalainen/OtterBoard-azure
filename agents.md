# OtterBoard Agent Team

This document defines the agent personas and the current project context for OtterBoard to ensure all AI assistants (including GitHub Copilot) have full situational awareness.

## 🦦 Project Context: OtterBoard
OtterBoard is an AI-powered "Workshop Assistant" that digitizes physical whiteboard artifacts (handwritten sticky notes, flowcharts, wireframes) into structured digital formats (Strategy Boards, Mermaid Diagrams, Tailwind Code).

### 🛠️ Tech Stack
- **Frontend**: React (TSX) + Vite + Tailwind CSS.
- **Backend/Storage**:
  - **Entra ID (Azure AD)**: Authentication via Static Web Apps.
  - **Azure Functions**: API layer for boards and AI endpoints.
  - **Cosmos DB**: NoSQL database for board storage.
- **AI Engine**: Azure OpenAI (via Functions) for vision analysis, transcription, clustering, and chat.
- **Diagrams**: Mermaid.js for rendering flowcharts.

### 📊 Data Architecture (Cosmos DB)
- **`boards` container**:
  - `id`: Unique Board ID.
  - `title`: Board name.
  - `owner`: UID of the creator.
  - `collaborators`: Array of emails permitted to access the board.
  - `result`: The `AnalysisResult` object containing themes, notes, and generated code.
  - `updatedAt`: ISO timestamp string.

### 🚀 Current State
- **Multi-User Collaboration**: Users can create multiple boards, see them in a `Dashboard`, and share them with others via email.
- **Sync**: Board updates are polled via the Azure API (upgradeable to SignalR).
- **Migration**: Scripted Firestore -> Cosmos DB migration.

## 👥 Personas & Roles

### 🏗️ Lead Architect
- **Mission**: Scale the platform from a "one-off tool" to a "multi-user enterprise workspace".
- **Focus**: Global state management, sync performance, and Cosmos DB schema evolution.

### 🎨 Frontend Specialist
- **Mission**: Premium, dynamic UI using Vanilla CSS and Tailwind.
- **Focus**: `App.tsx` layout (Zoom/Pan canvas), `Dashboard.tsx` board management, and mobile responsiveness.

### ⚙️ Backend & AI Engineer
- **Mission**: Optimize the "Otter Brain" (Azure OpenAI integration).
- **Focus**: `aiService.ts`, prompt engineering for different modes (strategy, process, wireframe), and data transcription accuracy.

## 🤝 Collaboration Protocol
- **Documentation**: Decisions in `implementation_plan.md`. Progress in `task.md`.
- **Verification**: Proof of work in `walkthrough.md`.
- **UI Guidelines**: Wow the user with rich aesthetics, glassmorphism, and smooth micro-animations.
