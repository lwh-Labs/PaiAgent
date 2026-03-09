# AI Agent 播客工作流编辑与执行平台

> 一个可视化 AI 工作流编排平台，支持大模型调用、超拟人音频合成，实现 AI 播客一键生成。

---

## 项目概述

本项目是一个 AI Agent 工作流编辑与执行平台，用户可以通过可视化拖拽方式编排 AI 工作流节点，完成调试与执行。

**核心场景**：AI 播客生成
```
用户输入文字 → 大模型节点（LLM 处理） → 超拟人音频合成节点（CosyVoice TTS） → 结束节点（输出音频） → 调试面板播放音频
```

---

## 技术架构

| 层次 | 技术选型 |
|------|----------|
| 前端 | React 18 + TypeScript + Vite |
| 流图库 | React Flow v11 |
| UI 组件 | Ant Design |
| 后端 | Spring Boot 3.x + Java 17 |
| 工作流引擎 | 自研轻量级 DAG 引擎 |
| 数据库 | MySQL 8.x |
| ORM | Spring Data JPA |
| LLM 集成 | OpenAI / DeepSeek / 通义千问 |
| TTS 集成 | 阿里云 CosyVoice |

---

## 项目结构

```
PaiAgent/
├── backend/              # Spring Boot 后端项目
│   ├── src/main/java/com/paiagent/
│   │   ├── controller/   # REST API 接口
│   │   ├── engine/       # DAG 工作流引擎核心
│   │   ├── entity/       # JPA 实体类
│   │   ├── service/      # 业务逻辑
│   │   └── ...
│   ├── src/main/resources/
│   │   ├── application.yml   # 应用配置
│   │   └── schema.sql        # 数据库初始化脚本
│   └── pom.xml
├── frontend/             # React 前端项目
│   ├── src/
│   │   ├── components/   # 组件目录
│   │   ├── api/          # API 封装
│   │   ├── hooks/        # 自定义 Hooks
│   │   └── types/        # TypeScript 类型
│   └── package.json
└── README.md
```

---

## 快速开始

### 环境要求

- Java 17+
- Maven 3.8+
- Node.js 18+
- MySQL 8.0+

### 1. 数据库初始化

```sql
-- 创建数据库
CREATE DATABASE ai_agent_workflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 执行建表脚本（位于 backend/src/main/resources/schema.sql）
```

### 2. 启动后端

```bash
cd backend

# 修改配置
# 编辑 src/main/resources/application.yml，配置 MySQL 连接信息

# 编译运行
mvn spring-boot:run
```

后端服务将启动在 `http://localhost:8080`

### 3. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将启动在 `http://localhost:5173`

---

## 核心功能

### 工作流编辑器

- **左侧节点面板**：拖拽 LLM 节点、TTS 节点到画板
- **中央画板**：React Flow 可视化编辑，支持节点拖拽、连线、删除
- **节点配置**：点击节点打开配置抽屉，配置参数

### 支持的节点类型

| 节点 | 类型 | 说明 |
|------|------|------|
| 用户输入 | START | 工作流起始节点，接收用户输入文字 |
| 大模型 | LLM | 调用 LLM API，支持 OpenAI/DeepSeek/通义千问 |
| 音频合成 | TTS | 调用 CosyVoice 合成超拟人语音 |
| 结束 | END | 工作流终止节点 |

### 调试执行

- 打开调试抽屉，输入测试文字
- 点击"运行工作流"执行
- 实时查看每个节点的执行状态和输出
- 音频合成完成后自动展示播放器

---

## API 接口

### 工作流管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workflows` | 获取工作流列表 |
| GET | `/api/workflows/{id}` | 获取工作流详情 |
| POST | `/api/workflows` | 创建工作流 |
| PUT | `/api/workflows/{id}` | 更新工作流 |
| DELETE | `/api/workflows/{id}` | 删除工作流 |

### 工作流执行

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/workflows/{id}/execute` | 执行工作流 |
| GET | `/api/executions/{executionId}` | 获取执行记录 |
| GET | `/api/workflows/{id}/executions` | 获取执行历史 |

### 音频文件

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/audio/{filename}` | 获取音频文件 |

---

## 配置说明

### 后端配置 (application.yml)

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/ai_agent_workflow?useSSL=false&serverTimezone=UTC
    username: root
    password: your_password_here
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
```

### 前端配置

前端默认连接 `http://localhost:8080`，如需修改，编辑 `frontend/src/api/index.ts`：

```typescript
const api = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 30000,
});
```

---

## 节点配置参数

### LLM 节点

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| provider | enum | 是 | LLM 提供商：openai / deepseek / qwen |
| model | string | 是 | 模型名称，如 gpt-4o、deepseek-chat |
| apiKey | string | 是 | API 密钥（后端存储，前端脱敏显示） |
| systemPrompt | string | 否 | 系统提示词 |
| temperature | float | 否 | 生成温度，范围 0~2，默认 0.7 |
| maxTokens | int | 否 | 最大 token 数，默认 2048 |

### TTS 节点

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| apiKey | string | 是 | CosyVoice API 密钥 |
| voiceId | string | 是 | 音色 ID，如 longxiaochun |
| speed | float | 否 | 语速，范围 0.5~2.0，默认 1.0 |
| pitch | float | 否 | 音调，范围 0.5~2.0，默认 1.0 |

---

## 安全说明

- API 密钥存储在后端数据库，**不在前端明文展示**
- 前端配置 API 密钥时，后端加密存储，显示为 `****`
- 音频文件临时存储，不做长期保留
- 单用户系统，无需登录认证

---

## 开发计划

当前为 MVP 版本，后续可扩展：
- 多用户支持与权限管理
- 工作流版本管理
- 节点并行执行
- WebSocket 实时推送
- 更多节点类型（条件分支、循环、HTTP 请求等）

---

## 许可证

MIT License
