import axios from 'axios';
import type { WorkflowDTO, ExecuteRequest, ExecuteResponse } from '../types';

// 创建 Axios 实例，后端地址为 localhost:8080
const apiClient = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 180000, // LLM+TTS 可能耗时较长，超时设为 3 分钟
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== 工作流管理接口 ====================

/** 获取工作流列表 */
export const getWorkflows = (): Promise<WorkflowDTO[]> =>
  apiClient.get<WorkflowDTO[]>('/api/workflows').then((res) => res.data);

/** 获取单个工作流详情 */
export const getWorkflow = (id: number): Promise<WorkflowDTO> =>
  apiClient.get<WorkflowDTO>(`/api/workflows/${id}`).then((res) => res.data);

/** 创建工作流 */
export const createWorkflow = (data: WorkflowDTO): Promise<WorkflowDTO> =>
  apiClient.post<WorkflowDTO>('/api/workflows', data).then((res) => res.data);

/** 更新工作流 */
export const updateWorkflow = (id: number, data: WorkflowDTO): Promise<WorkflowDTO> =>
  apiClient.put<WorkflowDTO>(`/api/workflows/${id}`, data).then((res) => res.data);

/** 删除工作流 */
export const deleteWorkflow = (id: number): Promise<void> =>
  apiClient.delete(`/api/workflows/${id}`).then(() => undefined);

// ==================== 工作流执行接口 ====================

/** 执行工作流 */
export const executeWorkflow = (id: number, input: ExecuteRequest): Promise<ExecuteResponse> =>
  apiClient
    .post<ExecuteResponse>(`/api/workflows/${id}/execute`, input)
    .then((res) => res.data);

/** 获取执行记录详情 */
export const getExecution = (executionId: number): Promise<ExecuteResponse> =>
  apiClient.get<ExecuteResponse>(`/api/executions/${executionId}`).then((res) => res.data);

/** 获取工作流历史执行记录 */
export const getWorkflowExecutions = (id: number): Promise<ExecuteResponse[]> =>
  apiClient.get<ExecuteResponse[]>(`/api/workflows/${id}/executions`).then((res) => res.data);

export default apiClient;
