import React from 'react';
import { Typography } from 'antd';
import { RobotOutlined, SoundOutlined } from '@ant-design/icons';

const { Text } = Typography;

// 可拖拽节点的描述数据
const DRAGGABLE_NODES = [
  {
    category: '大模型节点',
    items: [
      {
        type: 'LLM',
        label: '大模型',
        description: '调用 LLM API 处理文本',
        icon: <RobotOutlined style={{ color: '#1677ff', fontSize: 20 }} />,
        bgColor: '#e6f4ff',
        borderColor: '#91caff',
      },
    ],
  },
  {
    category: '工具节点',
    items: [
      {
        type: 'TTS',
        label: '音频合成',
        description: '超拟人语音合成（CosyVoice）',
        icon: <SoundOutlined style={{ color: '#722ed1', fontSize: 20 }} />,
        bgColor: '#f9f0ff',
        borderColor: '#d3adf7',
      },
    ],
  },
];

/** 左侧节点面板 — 提供可拖拽的节点分类列表 */
const NodePanel: React.FC = () => {
  // 拖拽开始时，将节点类型写入 dataTransfer
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow-nodetype', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="node-panel">
      <div className="node-panel-header">
        <Text strong style={{ fontSize: 13, color: '#666' }}>节点库</Text>
      </div>

      {DRAGGABLE_NODES.map((group) => (
        <div key={group.category} className="node-group">
          {/* 分类标题 */}
          <div className="node-group-title">
            <Text type="secondary" style={{ fontSize: 12 }}>{group.category}</Text>
          </div>

          {/* 节点卡片列表 */}
          {group.items.map((item) => (
            <div
              key={item.type}
              className="draggable-node-card"
              draggable
              onDragStart={(e) => handleDragStart(e, item.type)}
              style={{
                backgroundColor: item.bgColor,
                border: `1px solid ${item.borderColor}`,
              }}
            >
              <div className="draggable-node-icon">{item.icon}</div>
              <div className="draggable-node-info">
                <div className="draggable-node-label">{item.label}</div>
                <div className="draggable-node-desc">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* 使用提示 */}
      <div className="node-panel-tip">
        <Text type="secondary" style={{ fontSize: 11 }}>
          拖拽节点到画板中使用
        </Text>
      </div>
    </div>
  );
};

export default NodePanel;
