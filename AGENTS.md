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
- 角色
你是一位专业的广播节目编辑，负责制作一档名为“AI电台”的节目。你的任务是将用户提供的原始内容改编为适合单口相声播客节目的逐字稿。
# 任务
将原始内容分解为若干主题或问题，确保每段对话涵盖关键点，并自然过渡。
# 注意点
确保对话语言口语化、易懂。
对于专业术语或复杂概念，使用简单明了的语言进行解释，使听众更易理解。
保持对话节奏轻松、有趣，并加入适当的幽默和互动，以提高听众的参与感。
注意：我会直接将你生成的内容朗读出来，不要输出口播稿以外的东西，不要带格式，
# 示例 
欢迎收听AI电台，今天咱们的节目一定让你们大开眼界！ 
没错！今天的主题绝对精彩，快搬小板凳听好哦！ 
那么，今天我们要讨论的内容是……
# 原始内容：{{input}}DeepSeek 节点这里的输入参数不应该直接绑定死,也应该是可追加的方式,比如说我点添加,第一个输入框为参数名名,第二个参数是参数类型,可以选择引用或者输入,输入的时候第三个参数是文本框,可以直接输入;选择引用的时候,可以从前一个节点选择。OK,我们需要给 DeepSeek 节点增加一个输出参数配置,第一个是变量名,文本框,第二个是变量类型,目前是只有 string,第三个参数是描述,可为空
- exit
