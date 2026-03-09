import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { FlagOutlined } from '@ant-design/icons';
import type { NodeStatus } from '../../types';

// END 节点的数据结构
interface EndNodeData {
  status?: NodeStatus;
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

/** 结束节点（END）— 工作流终止节点，只有输入端口 */
const EndNode: React.FC<NodeProps<EndNodeData>> = ({ data }) => {
  return (
    <div
      className="custom-node end-node"
      style={getStatusStyle(data.status)}
    >
      {/* 仅有输入端口（顶部） */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="node-handle"
      />

      {/* 节点图标 + 标题 */}
      <div className="node-header">
        <FlagOutlined className="node-icon end-icon" />
        <span className="node-title">输出</span>
      </div>
      <div className="node-desc">工作流输出结果</div>
    </div>
  );
};

export default EndNode;
