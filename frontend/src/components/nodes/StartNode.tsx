import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { PlayCircleOutlined } from '@ant-design/icons';
import type { NodeStatus } from '../../types';

// START 节点的数据结构
interface StartNodeData {
  status?: NodeStatus;
}

// 根据执行状态返回节点边框样式
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

/** 用户输入节点（START）— 工作流起始节点，只有输出端口 */
const StartNode: React.FC<NodeProps<StartNodeData>> = ({ data }) => {
  return (
    <div
      className="custom-node start-node"
      style={getStatusStyle(data.status)}
    >
      {/* 节点图标 + 标题 */}
      <div className="node-header">
        <PlayCircleOutlined className="node-icon start-icon" />
        <span className="node-title">输入</span>
      </div>
      <div className="node-desc">用户输入文本</div>

      {/* 仅有输出端口（底部） */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="node-handle"
      />
    </div>
  );
};

export default StartNode;
