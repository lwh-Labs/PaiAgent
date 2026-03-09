import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { SoundOutlined, LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { NodeStatus, TTSConfig } from '../../types';

// TTS 节点的数据结构
interface TTSNodeData {
  status?: NodeStatus;
  config?: TTSConfig;
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

/** 超拟人音频合成节点（TTS）— 调用 CosyVoice 合成语音，有输入/输出端口 */
const TTSNode: React.FC<NodeProps<TTSNodeData>> = ({ data }) => {
  const { config, status } = data;
  const voiceLabel = config?.voiceId || '未配置音色';

  return (
    <div
      className="custom-node tts-node"
      style={getStatusStyle(status)}
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
        <SoundOutlined className="node-icon tts-icon" />
        <span className="node-title">音频合成</span>
        <div className="node-status-icon">
          <StatusIcon status={status} />
        </div>
      </div>

      {/* 显示当前配置的音色 ID */}
      <div className="node-desc">
        音色：{voiceLabel}
      </div>

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

export default TTSNode;
