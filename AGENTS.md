# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## Project Overview

AI Agent workflow editor and execution platform for podcast generation. Users visually orchestrate AI workflow nodes (LLM, TTS) via drag-and-drop, then execute the workflow to generate audio.

**Core flow**: User input text → LLM node → TTS node (CosyVoice) → Audio output

## Commands

### Backend (Spring Boot)

```bash
cd backend

# Run development server (starts on http://localhost:8080)
mvn spring-boot:run

# Compile only
mvn compile

# Run tests
mvn test

# Package
mvn package -DskipTests
```

### Frontend (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Run development server (starts on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Backend Structure

```
backend/src/main/java/com/paiagent/
├── controller/     # REST APIs (WorkflowController, ExecutionController, AudioController)
├── service/        # Business logic (WorkflowService, ExecutionService)
├── engine/         # DAG workflow engine (core)
│   ├── DAGEngine.java           # Main engine: DAG validation, Kahn's topological sort, execution
│   ├── NodeHandler.java         # Strategy interface for node handlers
│   ├── handler/                 # Concrete handlers: StartNodeHandler, LLMNodeHandler, TTSNodeHandler, EndNodeHandler
│   ├── llm/                     # LLM providers: OpenAI, DeepSeek, Qwen (all use OpenAICompatibleProvider)
│   ├── ExecutionContext.java    # Holds node outputs and user input during execution
│   ├── WorkflowGraph.java       # Graph model with nodes and edges
│   └── NodeDefinition.java      # Node model (id, type, position, config)
├── entity/         # JPA entities (Workflow, ExecutionRecord)
├── repository/     # Spring Data JPA repositories
├── dto/            # Data transfer objects
└── config/         # Configurations (CORS, Jackson)
```

### Frontend Structure

```
frontend/src/
├── api/            # Axios client and API functions (baseURL: http://localhost:8080)
├── components/
│   ├── nodes/      # React Flow node components (StartNode, LLMNode, TTSNode, EndNode)
│   ├── config/     # Node configuration panels (LLMConfigPanel, TTSConfigPanel)
│   ├── FlowCanvas.tsx    # React Flow canvas with drag-and-drop
│   ├── NodePanel.tsx     # Left sidebar with draggable node templates
│   └── DebugDrawer.tsx   # Debug panel for workflow execution
├── hooks/
│   └── useWorkflow.ts    # Main hook managing workflow state, nodes, edges, save/load
├── types/          # TypeScript interfaces mirroring backend DTOs
└── App.tsx         # Root component
```

### Key Patterns

**Backend DAG Engine** (`DAGEngine.java`):
1. Validates DAG (must have START and END nodes, no cycles)
2. Uses Kahn's algorithm for topological sort
3. Executes nodes in order via `NodeHandler` strategy pattern
4. Stores each node's output in `ExecutionContext` for downstream nodes

**Adding a new node type**:
1. Backend: Create `XxxNodeHandler` implementing `NodeHandler`, register in `DAGEngine` constructor
2. Frontend: Create `XxxNode.tsx` in `components/nodes/`, add to `NodePanel.tsx`
3. Frontend: Create config panel if needed in `components/config/`
4. Update types in `frontend/src/types/index.ts`

### Node Types

| Type | Handler | Purpose |
|------|---------|---------|
| START | StartNodeHandler | Entry point, receives user input text |
| LLM | LLMNodeHandler | Calls LLM API (OpenAI/DeepSeek/Qwen) |
| TTS | TTSNodeHandler | Calls CosyVoice API for audio synthesis |
| END | EndNodeHandler | Terminal node, outputs final result |

### Database

Development uses H2 in-memory database (no MySQL required). H2 console available at `http://localhost:8080/h2-console` with JDBC URL `jdbc:h2:file:./data/paiagent`.

For production, switch to MySQL by modifying `application.yml` datasource configuration.

### API Endpoints

- `GET/POST/PUT/DELETE /api/workflows` - Workflow CRUD
- `POST /api/workflows/{id}/execute` - Execute workflow
- `GET /api/executions/{id}` - Get execution record
- `GET /api/audio/{filename}` - Get generated audio file
