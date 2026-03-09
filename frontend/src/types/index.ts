// 工作流 DTO（与后端 API 对应）
export interface WorkflowDTO {
  id?: number;
  name: string;
  description: string;
  graphJson: string;
  createdAt?: string;
  updatedAt?: string;
}

// 图数据（节点 + 连线）
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// 图节点（存储到后端的格式）
export interface GraphNode {
  id: string;
  type: 'START' | 'LLM' | 'TTS' | 'END';
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

// 图连线（存储到后端的格式）
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

// 执行请求
export interface ExecuteRequest {
  input: { text: string };
}

// 执行响应
export interface ExecuteResponse {
  executionId: number;
  status: string;
  nodeResults: NodeResult[];
  finalOutput: Record<string, unknown>;
}

// 节点执行结果
export interface NodeResult {
  nodeId: string;
  nodeType: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  output: Record<string, unknown>;
  startTime: string;
  endTime: string;
  errorMessage?: string;
}

// LLM 节点输入参数
export interface LLMInputParam {
  name: string;           // 参数名
  type: 'input' | 'reference';  // 参数类型：输入 或 引用
  value: string;          // 手动输入的值，或引用节点ID
  referenceField?: string; // 引用节点的输出字段名（如 "text"）
}

// LLM 节点输出参数
export interface LLMOutputParam {
  name: string;           // 变量名
  type: 'string';         // 变量类型，目前只有 string
  description?: string;   // 描述，可为空
}

// LLM 节点配置
export interface LLMConfig {
  provider: 'openai' | 'deepseek' | 'qwen';
  model: string;
  apiKey: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  inputParams?: LLMInputParam[];   // 输入参数配置
  outputParams?: LLMOutputParam[]; // 输出参数配置
}

// TTS 节点配置
export interface TTSConfig {
  apiKey: string;
  voiceId: string;
  speed?: number;
  pitch?: number;
}

// 输出节点配置 - 单个输出参数
export interface OutputParam {
  name: string;
  type: 'input' | 'reference';
  value: string; // 手动输入的值，或引用节点ID（如 "llm-101"）
}

// 输出节点配置
export interface EndConfig {
  outputParams: OutputParam[];
  answerContent: string; // 回答内容模板，支持 {{paramName}} 引用
}

// 节点执行状态（前端用于驱动视觉状态）
export type NodeStatus = 'default' | 'running' | 'success' | 'failed';

// 节点状态映射（nodeId -> status）
export type NodeStatusMap = Record<string, NodeStatus>;
