import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { RobotOutlined, LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { NodeStatus, LLMConfig, LLMInputParam, LLMOutputParam } from '../../types';

// LLM 节点的数据结构
interface LLMNodeData {
  status?: NodeStatus;
  config?: LLMConfig;
  label?: string;
}

// 根据执行状态返回边框样式
const getStatusStyle = (status?: NodeStatus): React.CSSProperties => {
  switch (status) {
    case 'running':
      return { border: '2px solid #1677ff', boxShadow: '0 0 0 2px rgba(22,119,255,0.2)' };
    case 'success':
      return { border: '2px solid #52c41a', boxShadow: '0 0 0 2px rgba(82,196,26,0.2)' };
    case 'failed':
      return { border: '2px solid #ff4d4f', boxShadow: '0 0 0 2px rgba(255,77,79,0.2)' };
    default:
      return { border: '2px solid #d9d9d9' };
  }
};

// 渲染状态角标图标
const StatusIcon: React.FC<{ status?: NodeStatus }> = ({ status }) => {
  if (status === 'running') return <LoadingOutlined style={{ color: '#1677ff', fontSize: 14 }} spin />;
  if (status === 'success') return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />;
  if (status === 'failed') return <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />;
  return null;
};

// provider 显示名称映射
const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  qwen: '通义千问',
};

/** 大模型节点（LLM）— 调用 LLM API 处理文本，有输入/输出端口 */
const LLMNode: React.FC<NodeProps<LLMNodeData>> = ({ data }) => {
  const { config, status } = data;
  const providerLabel = config?.provider ? PROVIDER_LABELS[config.provider] : '未配置';
  const modelLabel = config?.model || '未配置';
  const inputParams = config?.inputParams || [];
  const outputParams = config?.outputParams || [];

  return (
    <div
      className="custom-node llm-node"
      style={{ ...getStatusStyle(status), minWidth: 160 }}
    >
      {/* 输入端口（顶部） */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="node-handle"
      />

      {/* 节点头部：图标 + 标题 + 状态角标 */}
      <div className="node-header">
        <RobotOutlined className="node-icon llm-icon" />
        <span className="node-title">大模型</span>
        <div className="node-status-icon">
          <StatusIcon status={status} />
        </div>
      </div>

      {/* 显示当前配置的 provider + model */}
      <div className="node-desc">
        {providerLabel} / {modelLabel}
      </div>

      {/* 显示输入参数 */}
      {inputParams.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#666' }}>
          <div style={{ fontWeight: 500, marginBottom: 2 }}>输入:</div>
          {inputParams.map((param: LLMInputParam, idx: number) => (
            <div key={idx} style={{ paddingLeft: 4 }}>
              {param.name || '未命名'} ({param.type === 'reference' ? '引用' : '输入'})
            </div>
          ))}
        </div>
      )}

      {/* 显示输出参数 */}
      {outputParams.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#666' }}>
          <div style={{ fontWeight: 500, marginBottom: 2 }}>输出:</div>
          {outputParams.map((param: LLMOutputParam, idx: number) => (
            <div key={idx} style={{ paddingLeft: 4 }}>
              {param.name || '未命名'}: {param.type}
            </div>
          ))}
        </div>
      )}

      {/* 输出端口（底部） */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="node-handle"
      />
    </div>
  );
};

export default LLMNode;
