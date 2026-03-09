# 测试策略文档：AI Agent 播客工作流编辑与执行平台

> 文档版本：v1.0
> 创建日期：2026-03-08
> 状态：待确认

---

## 1. 需求摘要

**来源**：`.qoder/spec/ai-agent-podcast-workflow/01-requirement.md`

**功能点清单**：

| ID | 功能 | 关键验证行为 |
|----|------|-------------|
| F1 | 左侧节点面板 | 节点卡片展示、拖拽到画板生成对应节点 |
| F2 | 中央画板（React Flow） | 节点拖拽移动、连线、删除、缩放/平移、参数配置 |
| F3 | 工作流保存与恢复 | 保存流图配置到后端 MySQL，页面刷新后恢复 |
| F4 | 调试抽屉（Debug Drawer） | 文字输入、执行触发、逐节点状态展示、音频播放 |
| F5 | 节点视觉状态 | 调试执行时节点状态实时更新（默认/运行中/成功/失败） |
| F6 | 工作流管理 API | CRUD 接口：列表、详情、创建、更新、删除 |
| F7 | 工作流执行 API | 执行接口（同步 HTTP）、执行记录查询 |
| F8 | DAG 工作流引擎 | 拓扑排序、节点调度、数据传递、状态管理、异常处理 |
| F9 | LLM 节点集成 | 多厂商 LLM API 调用（OpenAI/DeepSeek/通义千问），策略模式 |
| F10 | TTS 节点集成（CosyVoice） | CosyVoice API 调用、音频文件存储、音频访问接口 |
| F11 | 数据持久化 | MySQL workflow 表 + execution_record 表 CRUD |
| F12 | API 密钥安全 | 密钥不在前端明文返回，展示为 `****` |
| F13 | 音频播放器 | HTML5 音频播放/暂停、进度拖拽、音量调节 |

---

## 2. 测试范围

### 2.1 单元测试（UT）

**需要**：是
**理由**：项目包含自研 DAG 工作流引擎（拓扑排序、节点调度、数据传递、异常处理）属于纯逻辑模块，极其适合单元测试覆盖。节点 Handler（LLM/TTS）的输入输出转换逻辑、API Controller 的请求校验与响应构造也需要 UT 保障。

**覆盖范围**：
- DAG 引擎核心逻辑（拓扑排序、环检测、DAG 合法性校验）
- ExecutionContext 数据传递机制
- 各节点 Handler（START/LLM/TTS/END）的逻辑处理
- LLM Provider 策略模式（Provider 选择与参数映射）
- 工作流管理 API Controller（请求校验、响应构造）
- 工作流执行 API Controller
- graph_json 序列化/反序列化
- API 密钥脱敏逻辑

**测试框架**：
- 后端：JUnit 5 + Mockito + AssertJ
- 前端：Vitest + React Testing Library

### 2.2 集成测试（IT）

**需要**：是
**理由**：项目涉及多模块交互：API Controller → 工作流引擎 → 节点 Handler → 数据库，需要验证模块间的集成正确性。数据库交互（workflow/execution_record 的 CRUD）需要真实数据库环境验证。

**覆盖范围**：
- 工作流 CRUD 全链路（API → Service → Repository → Database）
- 工作流执行全链路（API → 引擎 → Mock Handler → 数据库记录）
- 数据库 Repository 层（MyBatis-Plus / Spring Data JPA）
- 工作流保存后再加载的数据一致性

**测试框架**：
- 后端：Spring Boot Test + H2 内存数据库（替代 MySQL）+ @SpringBootTest
- 可选：Testcontainers + MySQL 容器（更真实的数据库环境）

### 2.3 端到端测试（E2E）

**需要**：否（由主动验证计划替代）
**理由**：本项目为全新 MVP 项目，前后端分离开发。完整的自动化 E2E 测试（如 Playwright/Cypress）涉及浏览器自动化、React Flow 画布交互模拟等，搭建成本高且对 MVP 阶段收益有限。建议通过**主动验证计划**（手工 + 半自动化 HTTP 验证）覆盖端到端场景，待产品稳定后再引入 E2E 自动化。

### 2.4 前端测试

**需要**：是（组件级别单元测试）
**理由**：前端包含多个关键交互组件（节点面板、调试抽屉、音频播放器），需要验证组件渲染与基本交互逻辑。React Flow 画布的底层拖拽/连线行为由库本身保障，不需额外测试。

**覆盖范围**：
- 左侧节点面板：节点列表渲染、拖拽事件触发
- 调试抽屉组件：输入框渲染、执行按钮状态、节点结果列表渲染
- 音频播放器组件：音频 URL 加载、播放控件渲染
- 节点配置面板：表单字段渲染、参数校验
- 节点视觉状态：根据不同状态渲染对应样式

**测试框架**：
- Vitest + React Testing Library + jsdom

---

## 3. 测试用例

### 3.1 后端单元测试用例

#### 3.1.1 DAG 引擎核心逻辑

| ID | 目标模块 | 场景 | 输入 | 预期输出 |
|----|---------|------|------|---------|
| UT-01 | DAG 拓扑排序 | 正常线性 DAG（START→LLM→TTS→END） | 4 节点 3 条边的 DAG | 正确的拓扑序列：[START, LLM, TTS, END] |
| UT-02 | DAG 拓扑排序 | 包含分支的 DAG（START→LLM1, START→LLM2, LLM1→END, LLM2→END） | 4 节点 4 条边 | 有效的拓扑序列（START 在前，END 在后） |
| UT-03 | DAG 环检测 | 包含环的图（A→B→C→A） | 存在环的图 | 抛出异常：DAG 包含环 |
| UT-04 | DAG 合法性校验 | 无 START 节点 | 缺少 START 节点的图 | 抛出异常：缺少起始节点 |
| UT-05 | DAG 合法性校验 | 多个 START 节点 | 含 2 个 START 的图 | 抛出异常：起始节点不唯一 |
| UT-06 | DAG 合法性校验 | 无 END 节点 | 缺少 END 节点的图 | 抛出异常：缺少终止节点 |
| UT-07 | DAG 合法性校验 | 正常合法 DAG | 标准 4 节点链 | 校验通过，无异常 |
| UT-08 | DAG 合法性校验 | 孤立节点（未连线） | 含孤立 LLM 节点的图 | 抛出异常或警告：存在不可达节点 |
| UT-09 | ExecutionContext | 写入并读取节点输出 | 写入 node_1 输出后读取 | 正确返回 node_1 的输出数据 |
| UT-10 | ExecutionContext | 读取不存在的节点输出 | 读取未写入的 node_x | 返回空或抛出明确异常 |
| UT-11 | ExecutionContext | 多上游节点输出合并 | node_1 和 node_2 均有输出，node_3 读取 | 正确合并两个上游节点的输出 |

#### 3.1.2 节点 Handler

| ID | 目标模块 | 场景 | 输入 | 预期输出 |
|----|---------|------|------|---------|
| UT-12 | StartHandler | 正常处理用户输入 | `{ "text": "测试文本" }` | 输出 `{ "text": "测试文本" }` |
| UT-13 | StartHandler | 空输入 | `{ "text": "" }` | 抛出异常或返回错误状态 |
| UT-14 | LLMHandler | 正常调用 LLM（Mock LLM Provider） | 文本输入 + OpenAI 配置 | 返回 LLM 生成的文本 |
| UT-15 | LLMHandler | LLM API 调用超时 | Mock 超时响应 | 节点状态 FAILED，含超时错误信息 |
| UT-16 | LLMHandler | LLM API 返回错误 | Mock 401/500 响应 | 节点状态 FAILED，含 API 错误信息 |
| UT-17 | LLMHandler | 缺少必填配置项（apiKey） | 无 apiKey 的节点配置 | 抛出配置校验异常 |
| UT-18 | TTSHandler | 正常调用 TTS（Mock CosyVoice） | 文本输入 + 有效配置 | 返回 `{ "audioUrl": "/api/audio/xxx.mp3" }` |
| UT-19 | TTSHandler | TTS API 调用失败 | Mock 错误响应 | 节点状态 FAILED，含 TTS 错误信息 |
| UT-20 | TTSHandler | 空文本输入 | `{ "text": "" }` | 抛出异常或返回错误状态 |
| UT-21 | EndHandler | 正常收集上游输出 | 上游 TTS 节点输出含 audioUrl | 正确透传最终输出 |

#### 3.1.3 LLM Provider 策略模式

| ID | 目标模块 | 场景 | 输入 | 预期输出 |
|----|---------|------|------|---------|
| UT-22 | LLM Provider Factory | 根据 provider 类型选择实现 | `provider=openai` | 返回 OpenAI Provider 实例 |
| UT-23 | LLM Provider Factory | 根据 provider 类型选择实现 | `provider=deepseek` | 返回 DeepSeek Provider 实例 |
| UT-24 | LLM Provider Factory | 根据 provider 类型选择实现 | `provider=qwen` | 返回 Qwen Provider 实例 |
| UT-25 | LLM Provider Factory | 未知 provider 类型 | `provider=unknown` | 抛出异常：不支持的 LLM 提供商 |
| UT-26 | OpenAI Provider | 请求参数映射 | 模型名 + messages + temperature | 正确构建 OpenAI API 请求体 |
| UT-27 | DeepSeek Provider | baseUrl 复用 OpenAI 客户端 | DeepSeek 配置 | 请求发送到 DeepSeek 的 baseUrl |
| UT-28 | Qwen Provider | DashScope API 请求构建 | Qwen 配置 | 正确构建 DashScope API 请求体 |

#### 3.1.4 API Controller

| ID | 目标模块 | 场景 | 输入 | 预期输出 |
|----|---------|------|------|---------|
| UT-29 | WorkflowController | 创建工作流 | 有效的 workflow JSON | 201 Created + workflow ID |
| UT-30 | WorkflowController | 创建工作流 - 无效 JSON | 无效的 graph_json | 400 Bad Request + 错误信息 |
| UT-31 | WorkflowController | 获取工作流列表 | GET /api/workflows | 200 OK + 工作流列表 |
| UT-32 | WorkflowController | 获取工作流详情 | 有效的 workflow ID | 200 OK + 工作流详情 |
| UT-33 | WorkflowController | 获取不存在的工作流 | 无效的 workflow ID | 404 Not Found |
| UT-34 | WorkflowController | 更新工作流 | 有效 ID + 更新数据 | 200 OK + 更新后的工作流 |
| UT-35 | WorkflowController | 删除工作流 | 有效 ID | 204 No Content |
| UT-36 | ExecutionController | 执行工作流 | 有效 ID + 用户输入 | 200 OK + 执行结果（含各节点状态） |
| UT-37 | ExecutionController | 执行不存在的工作流 | 无效 ID | 404 Not Found |
| UT-38 | ExecutionController | 获取执行记录 | 有效 executionId | 200 OK + 执行记录详情 |
| UT-39 | WorkflowController | API 密钥脱敏 | 获取含 apiKey 的工作流 | 响应中 apiKey 显示为 `****` |

#### 3.1.5 其他后端逻辑

| ID | 目标模块 | 场景 | 输入 | 预期输出 |
|----|---------|------|------|---------|
| UT-40 | graph_json 序列化 | 正常序列化 | Workflow 对象 | 正确的 JSON 字符串 |
| UT-41 | graph_json 反序列化 | 正常反序列化 | 有效 JSON 字符串 | 正确的 Workflow 对象（含节点、连线） |
| UT-42 | graph_json 反序列化 | 无效 JSON | 格式错误的 JSON | 抛出反序列化异常 |

### 3.2 后端集成测试用例

| ID | 涉及模块 | 场景 | 前置条件 | 预期结果 |
|----|---------|------|---------|---------|
| IT-01 | API → Service → DB | 工作流 CRUD 完整流程 | H2 内存数据库就绪 | 创建 → 查询 → 更新 → 删除均成功，数据一致 |
| IT-02 | API → Service → DB | 工作流列表分页查询 | 数据库中已有多条工作流 | 返回正确数量与分页信息 |
| IT-03 | API → Engine → DB | 工作流执行端到端（Mock 外部 API） | 已保存的合法工作流 + Mock LLM/TTS | 执行成功，execution_record 正确写入 |
| IT-04 | API → Engine → DB | 工作流执行失败记录 | 已保存的工作流 + Mock LLM 返回错误 | execution_record 状态为 FAILED，error_message 非空 |
| IT-05 | API → Engine → DB | 执行记录查询 | 已有执行记录 | 正确返回执行记录及各节点结果 |
| IT-06 | API → Service → DB | 保存后加载数据一致性 | 保存含完整 graph_json 的工作流 | 加载后节点、连线、配置与保存时完全一致 |
| IT-07 | Engine → Handlers | 引擎调度全链路（Mock Handler） | 合法的 4 节点 DAG | 引擎按拓扑顺序依次调用各 Handler，Context 数据正确传递 |
| IT-08 | Audio Controller | 音频文件访问 | 本地已存在音频文件 | GET /api/audio/{filename} 返回正确的音频二进制流 |
| IT-09 | API → Engine | 节点失败后终止后续 | LLM 节点 Mock 失败 | TTS/END 节点状态为 SKIPPED |

### 3.3 前端单元测试用例

| ID | 目标组件 | 场景 | 预期结果 |
|----|---------|------|---------|
| FT-01 | NodePanel（左侧面板） | 渲染节点列表 | 正确渲染"大模型节点"和"超拟人音频合成节点"卡片 |
| FT-02 | NodePanel | 拖拽事件触发 | dragStart 事件携带正确的节点类型数据 |
| FT-03 | DebugDrawer（调试抽屉） | 初始渲染 | 输入框、执行按钮正确渲染，按钮默认可点击 |
| FT-04 | DebugDrawer | 执行中状态 | 点击执行后按钮变为 loading 状态，禁用重复点击 |
| FT-05 | DebugDrawer | 执行结果展示 | 传入 nodeResults 数据后，逐节点渲染状态与输出 |
| FT-06 | DebugDrawer | 错误信息展示 | 传入 FAILED 状态的节点结果，展示错误信息 |
| FT-07 | AudioPlayer（音频播放器） | 有 audioUrl 时渲染 | 传入 audioUrl 后正确渲染音频播放控件 |
| FT-08 | AudioPlayer | 无 audioUrl 时不渲染 | 不传入 audioUrl 时不渲染播放器 |
| FT-09 | AudioPlayer | 加载失败 | 音频 URL 无效时显示错误提示 |
| FT-10 | NodeConfigPanel（节点配置） | LLM 节点配置表单 | 渲染 provider 选择、model 输入、apiKey 输入等字段 |
| FT-11 | NodeConfigPanel | TTS 节点配置表单 | 渲染 voiceId、speed、pitch 等字段 |
| FT-12 | NodeConfigPanel | 必填校验 | 未填写必填项时显示校验错误 |
| FT-13 | CustomNode（画板节点） | 默认状态样式 | 渲染正常边框样式 |
| FT-14 | CustomNode | 运行中状态样式 | 蓝色边框 + loading 动效 |
| FT-15 | CustomNode | 成功状态样式 | 绿色边框 |
| FT-16 | CustomNode | 失败状态样式 | 红色边框 + 错误提示 |

---

## 4. 执行计划

### 4.1 测试命令

| 类型 | 命令 | 工作目录 | 说明 |
|------|------|---------|------|
| 后端 UT | `mvn test -pl backend -Dtest="*Test" -DfailIfNoTests=false` | 项目根目录 | 执行所有后端单元测试 |
| 后端 IT | `mvn verify -pl backend -Dtest="*IT" -DfailIfNoTests=false` | 项目根目录 | 执行所有后端集成测试（需 H2 自动配置） |
| 后端全部 | `mvn verify -pl backend` | 项目根目录 | 执行后端所有测试 |
| 前端 UT | `npx vitest run` | 前端项目目录 | 执行所有前端单元测试 |
| 前端覆盖率 | `npx vitest run --coverage` | 前端项目目录 | 生成前端测试覆盖率报告 |

> **说明**：具体模块名称（如 `backend`、前端项目路径）需根据实际项目结构调整。若项目为单模块 Maven 项目，去掉 `-pl backend` 参数。

### 4.2 环境与依赖

| 依赖项 | 是否必需 | 如何准备 |
|--------|---------|---------|
| JDK 17+ | 是 | 安装 JDK 17 或更高版本 |
| Maven 3.x | 是 | 安装 Maven 3.8+ |
| Node.js 18+ | 是 | 安装 Node.js 18 LTS 或更高版本 |
| MySQL 8.x | 仅主动验证时 | 本地安装或 Docker 运行 `mysql:8` 容器；UT/IT 使用 H2 替代 |
| H2 Database | 是（IT 阶段） | Maven 依赖自动引入，无需额外安装 |
| LLM API Key | 仅主动验证时 | 用户提供 OpenAI/DeepSeek/通义千问 API Key |
| CosyVoice API Key | 仅主动验证时 | 用户提供阿里云 DashScope API Key |
| Docker（可选） | 否 | 如使用 Testcontainers 运行 MySQL 容器则需要 |

### 4.3 自动化执行评估

**总体评估**：大部分可自动执行

| 类型 | 可自动执行 | 限制条件 |
|------|-----------|---------|
| 后端 UT | 是 | 无限制，所有外部依赖均通过 Mockito Mock |
| 后端 IT | 是 | 使用 H2 内存数据库替代 MySQL，无需外部服务 |
| 前端 UT | 是 | 使用 jsdom 模拟浏览器环境，无需真实浏览器 |
| 主动验证（API 测试） | 部分 | 需要 MySQL 服务运行、后端应用启动 |
| 主动验证（端到端） | 部分 | 需要 MySQL + 后端启动 + 有效的 LLM/TTS API Key |

---

## 5. 验收标准

### 5.1 测试通过标准

| 类型 | 通过标准 |
|------|---------|
| 后端 UT | 全部通过，核心模块（DAG 引擎、Handler）行覆盖率 >= 80% |
| 后端 IT | 全部通过 |
| 前端 UT | 全部通过，关键组件（DebugDrawer、AudioPlayer）有测试覆盖 |
| 主动验证 | 所有 AV 操作预期结果匹配 |

### 5.2 功能-测试映射

| 功能 | 验证测试 |
|------|---------|
| F1 左侧节点面板 | FT-01, FT-02 |
| F2 中央画板 | FT-13 ~ FT-16（节点状态样式） |
| F3 工作流保存与恢复 | IT-01, IT-06, AV-02, AV-03 |
| F4 调试抽屉 | FT-03 ~ FT-06, AV-05 |
| F5 节点视觉状态 | FT-13 ~ FT-16 |
| F6 工作流管理 API | UT-29 ~ UT-35, IT-01, IT-02, AV-01, AV-02, AV-03 |
| F7 工作流执行 API | UT-36 ~ UT-38, IT-03 ~ IT-05, IT-09, AV-04, AV-05 |
| F8 DAG 工作流引擎 | UT-01 ~ UT-11, IT-07, IT-09 |
| F9 LLM 节点集成 | UT-14 ~ UT-17, UT-22 ~ UT-28, AV-06 |
| F10 TTS 节点集成 | UT-18 ~ UT-20, AV-07, AV-08 |
| F11 数据持久化 | IT-01 ~ IT-06 |
| F12 API 密钥安全 | UT-39, AV-03 |
| F13 音频播放器 | FT-07 ~ FT-09, AV-08 |

---

## 6. 主动验证计划

### 6.1 验证操作总表

| ID | 描述 | 类型 | 命令/请求 | 预期结果 | 风险级别 |
|----|------|------|----------|---------|---------|
| AV-01 | 工作流管理 API - 创建 | HTTP | POST /api/workflows | 201 Created + 返回工作流 ID | 低 |
| AV-02 | 工作流管理 API - 查询详情 | HTTP | GET /api/workflows/{id} | 200 OK + 完整工作流配置 | 低 |
| AV-03 | API 密钥脱敏验证 | HTTP | GET /api/workflows/{id} | 响应中 apiKey 字段为 `****` | 低 |
| AV-04 | 工作流执行 API（Mock 场景） | HTTP | POST /api/workflows/{id}/execute | 200 OK + 各节点状态 SUCCESS | 中 |
| AV-05 | 执行记录查询 | HTTP | GET /api/executions/{executionId} | 200 OK + 含 nodeResults 的执行记录 | 低 |
| AV-06 | LLM 节点真实调用 | HTTP | POST /api/workflows/{id}/execute | LLM 节点返回有意义的文本 | 高 |
| AV-07 | TTS 节点真实调用 | HTTP | POST /api/workflows/{id}/execute | TTS 节点返回有效 audioUrl | 高 |
| AV-08 | 音频文件访问 | HTTP | GET /api/audio/{filename} | 200 OK + Content-Type: audio/mpeg + 非空响应体 | 低 |
| AV-09 | 端到端 AI 播客场景 | 用户模拟 | 完整播客工作流执行 | 输入文字→LLM 生成→TTS 合成→音频可播放 | 高 |
| AV-10 | 工作流异常处理验证 | HTTP | POST /api/workflows/{id}/execute（无效 apiKey） | 返回 FAILED 状态 + 明确错误信息 | 中 |

### 6.2 执行详情

---

**AV-01: 工作流管理 API - 创建工作流**

- **类型**：HTTP Request
- **描述**：验证创建工作流 API 是否正确持久化工作流配置

**前置条件**：
- **构建要求**：后端项目需先编译打包（`mvn clean package -DskipTests`）
- **服务依赖**：MySQL 8.x 数据库运行中，已创建 `ai_agent_workflow` 数据库；Spring Boot 应用已启动（默认端口 8080）
- **数据准备**：无
- **环境变量**：数据库连接信息已在 `application.yml` 中配置

**执行上下文**：
- **工作目录**：项目根目录
- **执行顺序**：无依赖，可独立执行
- **超时**：10s

**操作**：
- **命令/请求**：
```bash
curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI播客测试工作流",
    "description": "用于验证的测试工作流",
    "graphJson": {
      "nodes": [
        {"id": "node_1", "type": "START", "position": {"x": 100, "y": 200}, "config": {}},
        {"id": "node_2", "type": "LLM", "position": {"x": 300, "y": 200}, "config": {"provider": "openai", "model": "gpt-4o", "apiKey": "sk-test-key-123", "systemPrompt": "你是一个播客主持人", "temperature": 0.7, "maxTokens": 2048}},
        {"id": "node_3", "type": "TTS", "position": {"x": 500, "y": 200}, "config": {"apiKey": "tts-test-key", "voiceId": "longxiaochun", "speed": 1.0, "pitch": 1.0}},
        {"id": "node_4", "type": "END", "position": {"x": 700, "y": 200}, "config": {}}
      ],
      "edges": [
        {"id": "edge_1", "source": "node_1", "target": "node_2"},
        {"id": "edge_2", "source": "node_2", "target": "node_3"},
        {"id": "edge_3", "source": "node_3", "target": "node_4"}
      ]
    }
  }'
```
- **参数说明**：发送完整的 AI 播客标准 4 节点工作流配置，含 START→LLM→TTS→END 链路

**验证标准**：
- **成功条件**：HTTP 状态码为 201（或 200），响应体包含 `"id"` 字段且值为正整数
- **失败条件**：HTTP 状态码非 2xx，或响应体不包含 `id` 字段
- **输出格式**：JSON，包含 `id`、`name`、`description`、`graphJson`、`createdAt` 等字段

**清理**：记录返回的 workflow ID，供后续验证使用

**风险级别**：低

---

**AV-02: 工作流管理 API - 查询详情**

- **类型**：HTTP Request
- **描述**：验证保存的工作流可正确查询，数据与创建时一致

**前置条件**：
- **构建要求**：同 AV-01
- **服务依赖**：同 AV-01
- **数据准备**：AV-01 已成功执行，获取到 workflow ID
- **环境变量**：同 AV-01

**执行上下文**：
- **工作目录**：项目根目录
- **执行顺序**：在 AV-01 之后
- **超时**：10s

**操作**：
- **命令/请求**：
```bash
curl -s -w "\n%{http_code}" -X GET http://localhost:8080/api/workflows/{id}
```
- **参数说明**：`{id}` 替换为 AV-01 返回的 workflow ID

**验证标准**：
- **成功条件**：HTTP 状态码 200，响应体中 `name` 为 "AI播客测试工作流"，`graphJson.nodes` 数组长度为 4，`graphJson.edges` 数组长度为 3
- **失败条件**：HTTP 状态码非 200，或数据与创建时不一致
- **输出格式**：JSON，完整的工作流配置

**清理**：无

**风险级别**：低

---

**AV-03: API 密钥脱敏验证**

- **类型**：HTTP Request
- **描述**：验证查询工作流详情时，API 密钥不以明文返回

**前置条件**：
- **构建要求**：同 AV-01
- **服务依赖**：同 AV-01
- **数据准备**：AV-01 已成功执行
- **环境变量**：同 AV-01

**执行上下文**：
- **工作目录**：项目根目录
- **执行顺序**：在 AV-01 之后
- **超时**：10s

**操作**：
- **命令/请求**：
```bash
curl -s http://localhost:8080/api/workflows/{id} | python -c "
import sys, json
data = json.load(sys.stdin)
nodes = data.get('graphJson', {}).get('nodes', [])
for node in nodes:
    config = node.get('config', {})
    if 'apiKey' in config:
        key = config['apiKey']
        print(f\"Node {node['id']} ({node['type']}): apiKey = {key}\")
        assert key == '****' or key.startswith('****'), f'API Key not masked: {key}'
print('All API keys are properly masked.')
"
```
- **参数说明**：查询工作流详情并检查所有节点配置中的 apiKey 字段

**验证标准**：
- **成功条件**：所有含 apiKey 的节点配置中，apiKey 值为 `****` 或类似脱敏格式，脚本输出 "All API keys are properly masked."
- **失败条件**：任何 apiKey 以明文形式返回（如 "sk-test-key-123"）
- **输出格式**：文本输出各节点的 apiKey 状态

**清理**：无

**风险级别**：低

---

**AV-04: 工作流执行 API（Mock 场景验证）**

- **类型**：HTTP Request
- **描述**：验证工作流执行 API 的完整响应结构和节点执行流程（需在 LLM/TTS 可用或已配置有效 Key 的前提下；如外部 API 不可用，可基于错误响应验证异常处理链路）

**前置条件**：
- **构建要求**：同 AV-01
- **服务依赖**：同 AV-01；如需验证正常执行，还需 LLM/TTS API 可达
- **数据准备**：AV-01 创建的工作流存在
- **环境变量**：同 AV-01

**执行上下文**：
- **工作目录**：项目根目录
- **执行顺序**：在 AV-01 之后
- **超时**：180s（LLM + TTS 调用可能较慢）

**操作**：
- **命令/请求**：
```bash
curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/workflows/{id}/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "请用三句话介绍人工智能"
    }
  }'
```
- **参数说明**：向已保存的工作流发送执行请求，用户输入为简短文本以减少 LLM 响应时间

**验证标准**：
- **成功条件**：HTTP 状态码 200，响应包含 `executionId`、`status`（值为 SUCCESS 或 FAILED）、`nodeResults` 数组（长度 >= 3），每个节点结果含 `nodeId`、`nodeType`、`status`、`startTime`、`endTime`
- **失败条件**：HTTP 状态码非 200，或响应结构缺失必要字段
- **输出格式**：JSON，完整执行结果

**清理**：记录 executionId 供 AV-05 使用

**风险级别**：中

---

**AV-05: 执行记录查询**

- **类型**：HTTP Request
- **描述**：验证执行记录可通过 API 正确查询

**前置条件**：
- **构建要求**：同 AV-01
- **服务依赖**：同 AV-01
- **数据准备**：AV-04 已执行，获取到 executionId
- **环境变量**：同 AV-01

**执行上下文**：
- **工作目录**：项目根目录
- **执行顺序**：在 AV-04 之后
- **超时**：10s

**操作**：
- **命令/请求**：
```bash
curl -s -w "\n%{http_code}" -X GET http://localhost:8080/api/executions/{executionId}
```
- **参数说明**：`{executionId}` 替换为 AV-04 返回的执行 ID

**验证标准**：
- **成功条件**：HTTP 状态码 200，响应包含 `status`、`inputJson`、`outputJson`、`startedAt`、`finishedAt`、`durationMs` 字段
- **失败条件**：HTTP 状态码非 200，或字段缺失
- **输出格式**：JSON，执行记录详情

**清理**：无

**风险级别**：低

---

**AV-06: LLM 节点真实调用验证**

- **类型**：HTTP Request
- **描述**：验证 LLM 节点能成功调用真实 LLM API 并返回有意义文本

**前置条件**：
- **构建要求**：同 AV-01
- **服务依赖**：同 AV-01 + LLM API 可达（需要有效的 API Key）
- **数据准备**：需创建一个仅含 START→LLM→END 的简化工作流（不含 TTS），LLM 节点配置有效的 API Key
- **环境变量**：用户需提供有效的 LLM API Key

**执行上下文**：
- **工作目录**：项目根目录
- **执行顺序**：独立（需用户提前配置 API Key）
- **超时**：120s

**操作**：
- **命令/请求**：
```bash
# Step 1: 创建简化 LLM 测试工作流
curl -s -X POST http://localhost:8080/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "LLM单独测试",
    "description": "仅测试LLM节点",
    "graphJson": {
      "nodes": [
        {"id": "s1", "type": "START", "position": {"x": 100, "y": 200}, "config": {}},
        {"id": "l1", "type": "LLM", "position": {"x": 300, "y": 200}, "config": {"provider": "openai", "model": "gpt-4o-mini", "apiKey": "<USER_API_KEY>", "systemPrompt": "用一句话回答", "temperature": 0.7, "maxTokens": 100}},
        {"id": "e1", "type": "END", "position": {"x": 500, "y": 200}, "config": {}}
      ],
      "edges": [
        {"id": "ed1", "source": "s1", "target": "l1"},
        {"id": "ed2", "source": "l1", "target": "e1"}
      ]
    }
  }'

# Step 2: 执行工作流（用返回的 ID 替换 {id}）
curl -s -X POST http://localhost:8080/api/workflows/{id}/execute \
  -H "Content-Type: application/json" \
  -d '{"input": {"text": "什么是人工智能？"}}'
```
- **参数说明**：`<USER_API_KEY>` 需替换为用户的真实 API Key；使用 gpt-4o-mini 模型减少 token 消耗

**验证标准**：
- **成功条件**：LLM 节点 status 为 SUCCESS，output.text 非空且包含有意义的中文文本（长度 > 10 字符）
- **失败条件**：LLM 节点 status 为 FAILED，或 output.text 为空
- **输出格式**：JSON 执行结果

**清理**：可删除测试工作流（`DELETE /api/workflows/{id}`）

**风险级别**：高（依赖外部 API 可用性和有效 Key）

---

**AV-07: TTS 节点真实调用验证**

- **类型**：HTTP Request
- **描述**：验证 TTS 节点能成功调用 CosyVoice API 并生成音频文件

**前置条件**：
- **构建要求**：同 AV-01
- **服务依赖**：同 AV-01 + 阿里云 DashScope CosyVoice API 可达
- **数据准备**：需创建含 START→TTS→END 的简化工作流，TTS 节点配置有效的 CosyVoice API Key
- **环境变量**：用户需提供有效的阿里云 DashScope API Key

**执行上下文**：
- **工作目录**：项目根目录
- **执行顺序**：独立（需用户提前配置 CosyVoice API Key）
- **超时**：90s

**操作**：
- **命令/请求**：
```bash
# Step 1: 创建简化 TTS 测试工作流
curl -s -X POST http://localhost:8080/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TTS单独测试",
    "description": "仅测试TTS节点",
    "graphJson": {
      "nodes": [
        {"id": "s1", "type": "START", "position": {"x": 100, "y": 200}, "config": {}},
        {"id": "t1", "type": "TTS", "position": {"x": 300, "y": 200}, "config": {"apiKey": "<USER_COSYVOICE_KEY>", "voiceId": "longxiaochun", "speed": 1.0, "pitch": 1.0}},
        {"id": "e1", "type": "END", "position": {"x": 500, "y": 200}, "config": {}}
      ],
      "edges": [
        {"id": "ed1", "source": "s1", "target": "t1"},
        {"id": "ed2", "source": "t1", "target": "e1"}
      ]
    }
  }'

# Step 2: 执行工作流
curl -s -X POST http://localhost:8080/api/workflows/{id}/execute \
  -H "Content-Type: application/json" \
  -d '{"input": {"text": "你好，欢迎收听AI播客节目"}}'
```
- **参数说明**：`<USER_COSYVOICE_KEY>` 需替换为用户的阿里云 DashScope API Key

**验证标准**：
- **成功条件**：TTS 节点 status 为 SUCCESS，output 包含 `audioUrl` 字段，值以 `/api/audio/` 开头
- **失败条件**：TTS 节点 status 为 FAILED，或缺少 audioUrl
- **输出格式**：JSON 执行结果

**清理**：可删除测试工作流

**风险级别**：高（依赖外部 API 可用性和有效 Key）

---

**AV-08: 音频文件访问验证**

- **类型**：HTTP Request
- **描述**：验证 TTS 生成的音频文件可通过 API 正确下载和播放

**前置条件**：
- **构建要求**：同 AV-01
- **服务依赖**：同 AV-01
- **数据准备**：AV-07 已成功执行，获取到 audioUrl
- **环境变量**：同 AV-01

**执行上下文**：
- **工作目录**：项目根目录
- **执行顺序**：在 AV-07 之后
- **超时**：30s

**操作**：
- **命令/请求**：
```bash
curl -s -w "\nHTTP_CODE:%{http_code}\nCONTENT_TYPE:%{content_type}\nSIZE:%{size_download}" \
  -o /tmp/test_audio.mp3 \
  http://localhost:8080/api/audio/{filename}
```
- **参数说明**：`{filename}` 替换为 AV-07 返回的 audioUrl 中的文件名部分

**验证标准**：
- **成功条件**：HTTP 状态码 200，Content-Type 为 `audio/mpeg` 或 `audio/wav`，下载文件大小 > 0 字节
- **失败条件**：HTTP 状态码非 200，Content-Type 不正确，或文件大小为 0
- **输出格式**：二进制音频文件 + HTTP 头信息

**清理**：删除临时下载文件 `/tmp/test_audio.mp3`

**风险级别**：低

---

**AV-09: 端到端 AI 播客场景验证**

- **类型**：用户模拟（User Simulation）
- **描述**：验证完整的 AI 播客工作流：用户输入文字 → LLM 处理 → TTS 音频合成 → 音频可播放。这是核心业务场景的端到端验证。

**前置条件**：
- **构建要求**：前后端均需构建完成。后端 `mvn clean package -DskipTests`；前端 `npm run build`
- **服务依赖**：MySQL 运行中 + 后端 Spring Boot 启动 + 前端开发服务器启动（`npm run dev`）+ LLM API 可达 + CosyVoice API 可达
- **数据准备**：需要有效的 LLM API Key 和 CosyVoice API Key
- **环境变量**：LLM/TTS API Key 已配置到节点中

**执行上下文**：
- **工作目录**：项目根目录
- **执行顺序**：在 AV-01 ~ AV-08 全部通过之后
- **超时**：300s（含 LLM 推理 + TTS 合成完整链路）

**操作**：
- **命令/请求**：
```
手动执行步骤：
1. 浏览器打开前端页面（默认 http://localhost:5173）
2. 从左侧面板依次拖入：START 节点 → LLM 节点 → TTS 节点 → END 节点
3. 依次连线：START → LLM → TTS → END
4. 点击 LLM 节点，配置 provider=openai, model=gpt-4o-mini, apiKey=<真实Key>, systemPrompt="你是一个AI播客主持人，请用生动的语言回答问题"
5. 点击 TTS 节点，配置 apiKey=<CosyVoice Key>, voiceId=longxiaochun
6. 点击"保存"按钮
7. 打开调试抽屉，输入"请介绍一下人工智能的发展历程"
8. 点击"执行"按钮
9. 观察画板上节点状态变化（应依次变为蓝色运行中→绿色成功）
10. 在调试抽屉中查看各节点的输入/输出
11. 确认音频播放器出现并点击播放
```

**验证标准**：
- **成功条件**：
  - 所有节点执行状态为绿色（SUCCESS）
  - LLM 节点输出为有意义的中文文本（关于 AI 发展历程）
  - TTS 节点输出包含音频 URL
  - 音频播放器可正常播放，能听到语音内容
  - 调试抽屉正确展示每个节点的输入/输出和耗时
- **失败条件**：
  - 任何节点变为红色（FAILED）
  - 音频无法播放
  - 调试抽屉无法展示执行结果

**清理**：无（测试数据可保留）

**风险级别**：高（依赖完整环境 + 外部 API 可用性）

---

**AV-10: 工作流异常处理验证**

- **类型**：HTTP Request
- **描述**：验证工作流在外部 API 调用失败时的异常处理和错误信息返回

**前置条件**：
- **构建要求**：同 AV-01
- **服务依赖**：同 AV-01
- **数据准备**：创建一个 LLM 节点配置无效 apiKey 的工作流
- **环境变量**：同 AV-01

**执行上下文**：
- **工作目录**：项目根目录
- **执行顺序**：独立
- **超时**：30s

**操作**：
- **命令/请求**：
```bash
# Step 1: 创建含无效 Key 的工作流
curl -s -X POST http://localhost:8080/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "异常处理测试",
    "description": "无效API Key测试",
    "graphJson": {
      "nodes": [
        {"id": "s1", "type": "START", "position": {"x": 100, "y": 200}, "config": {}},
        {"id": "l1", "type": "LLM", "position": {"x": 300, "y": 200}, "config": {"provider": "openai", "model": "gpt-4o", "apiKey": "sk-invalid-key", "temperature": 0.7, "maxTokens": 100}},
        {"id": "e1", "type": "END", "position": {"x": 500, "y": 200}, "config": {}}
      ],
      "edges": [
        {"id": "ed1", "source": "s1", "target": "l1"},
        {"id": "ed2", "source": "l1", "target": "e1"}
      ]
    }
  }'

# Step 2: 执行工作流（预期失败）
curl -s -X POST http://localhost:8080/api/workflows/{id}/execute \
  -H "Content-Type: application/json" \
  -d '{"input": {"text": "测试异常处理"}}'
```
- **参数说明**：故意使用无效的 API Key 触发 LLM 调用失败

**验证标准**：
- **成功条件**：HTTP 状态码 200，响应中 `status` 为 "FAILED"，`nodeResults` 中 LLM 节点 status 为 "FAILED" 且包含 `errorMessage`（非空），END 节点 status 为 "SKIPPED"
- **失败条件**：返回 500 Internal Server Error（未正确处理异常），或错误信息为空
- **输出格式**：JSON 执行结果，含错误详情

**清理**：删除测试工作流（`DELETE /api/workflows/{id}`）

**风险级别**：中

---

### 6.3 主动验证评估

**总体评估**：部分可自动执行

| ID | 可自动执行 | 限制条件 | 需用户确认 |
|----|-----------|---------|-----------|
| AV-01 | 是 | 需 MySQL + 后端启动 | 否 |
| AV-02 | 是 | 依赖 AV-01 返回的 ID | 否 |
| AV-03 | 是 | 依赖 AV-01 返回的 ID | 否 |
| AV-04 | 部分 | 外部 API 不可用时仅能验证错误链路 | 否 |
| AV-05 | 是 | 依赖 AV-04 返回的 executionId | 否 |
| AV-06 | 否 | 需要用户提供有效 LLM API Key | 是 |
| AV-07 | 否 | 需要用户提供有效 CosyVoice API Key | 是 |
| AV-08 | 部分 | 依赖 AV-07 成功生成音频 | 否 |
| AV-09 | 否 | 需要完整环境 + 浏览器手动操作 + 有效 API Key | 是 |
| AV-10 | 是 | 需 MySQL + 后端启动 | 否 |

**执行建议**：
1. **第一阶段**（自动化，无需外部 API）：先执行 AV-01 → AV-02 → AV-03 → AV-10，验证基础 CRUD 和异常处理
2. **第二阶段**（半自动化，需 API Key）：用户提供 API Key 后执行 AV-06 → AV-07 → AV-08，验证外部集成
3. **第三阶段**（手工验证）：环境就绪后执行 AV-04 → AV-05 → AV-09，完成端到端验证
