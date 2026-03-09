import React, { useCallback, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeTypes,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Drawer, Typography } from 'antd';
import StartNode from './nodes/StartNode';
import LLMNode from './nodes/LLMNode';
import TTSNode from './nodes/TTSNode';
import EndNode from './nodes/EndNode';
import LLMConfigPanel from './config/LLMConfigPanel';
import TTSConfigPanel from './config/TTSConfigPanel';
import EndConfigPanel from './config/EndConfigPanel';
import type { LLMConfig, TTSConfig, EndConfig } from '../types';

const { Title } = Typography;

// 注册自定义节点类型（必须在组件外定义，避免重复渲染）
const nodeTypes: NodeTypes = {
  startNode: StartNode,
  llmNode: LLMNode,
  ttsNode: TTSNode,
  endNode: EndNode,
};

// 节点类型 -> React Flow 节点类型名称映射
const DRAG_TYPE_MAP: Record<string, string> = {
  LLM: 'llmNode',
  TTS: 'ttsNode',
};

let nodeIdCounter = 100; // 拖入节点的 ID 计数器

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  onNodeConfigChange: (nodeId: string, config: Record<string, unknown>) => void;
}

/** 内部 Canvas 组件（需要在 ReactFlowProvider 中使用 useReactFlow） */
const FlowCanvasInner: React.FC<FlowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  setNodes,
  onNodeConfigChange,
}) => {
  const { screenToFlowPosition } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // 当前选中节点（用于打开配置抽屉）
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);

  // 处理画板 dragOver（允许放置）
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // 处理节点从左侧面板拖入画板
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const draggedType = event.dataTransfer.getData('application/reactflow-nodetype');
      if (!draggedType || !DRAG_TYPE_MAP[draggedType]) return;

      // 将屏幕坐标转换为 React Flow 内部坐标
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNodeId = `${draggedType.toLowerCase()}-${++nodeIdCounter}`;
      const newNode: Node = {
        id: newNodeId,
        type: DRAG_TYPE_MAP[draggedType],
        position,
        data: {
          config: {},
          status: 'default',
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  // 点击节点时打开配置面板
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // START 节点无需配置
      if (node.type === 'startNode') return;
      setSelectedNode(node);
      setConfigDrawerOpen(true);
    },
    []
  );

  // LLM 配置变更
  const handleLLMConfigChange = useCallback(
    (config: LLMConfig) => {
      if (!selectedNode) return;
      onNodeConfigChange(selectedNode.id, config as unknown as Record<string, unknown>);
      // 同步更新 selectedNode 的 data，使抽屉内容保持最新
      setSelectedNode((prev) =>
        prev ? { ...prev, data: { ...prev.data, config } } : prev
      );
    },
    [selectedNode, onNodeConfigChange]
  );

  // TTS 配置变更
  const handleTTSConfigChange = useCallback(
    (config: TTSConfig) => {
      if (!selectedNode) return;
      onNodeConfigChange(selectedNode.id, config as unknown as Record<string, unknown>);
      setSelectedNode((prev) =>
        prev ? { ...prev, data: { ...prev.data, config } } : prev
      );
    },
    [selectedNode, onNodeConfigChange]
  );

  // END 配置变更
  const handleEndConfigChange = useCallback(
    (config: EndConfig) => {
      if (!selectedNode) return;
      onNodeConfigChange(selectedNode.id, config as unknown as Record<string, unknown>);
      setSelectedNode((prev) =>
        prev ? { ...prev, data: { ...prev.data, config } } : prev
      );
    },
    [selectedNode, onNodeConfigChange]
  );

  // 计算上游节点列表（排除 END 节点自身）
  const upstreamNodes = useMemo(
    () => nodes.filter((n) => n.type !== 'endNode'),
    [nodes]
  );

  // 节点配置抽屉标题
  const configDrawerTitle =
    selectedNode?.type === 'llmNode' ? '大模型节点配置'
    : selectedNode?.type === 'ttsNode' ? '音频合成节点配置'
    : selectedNode?.type === 'endNode' ? '输出节点配置'
    : '节点配置';

  return (
    <div
      ref={reactFlowWrapper}
      style={{ width: '100%', height: '100%' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          style: { stroke: '#b1b1b7', strokeWidth: 2 },
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#b1b1b7',
          },
        }}
      >
        <Background gap={16} color="#f0f0f0" />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'startNode') return '#52c41a';
            if (node.type === 'llmNode') return '#1677ff';
            if (node.type === 'ttsNode') return '#722ed1';
            if (node.type === 'endNode') return '#fa8c16';
            return '#aaa';
          }}
          style={{ background: '#fafafa', border: '1px solid #eee' }}
        />
      </ReactFlow>

      {/* 节点配置抽屉 */}
      <Drawer
        title={<Title level={5} style={{ margin: 0 }}>{configDrawerTitle}</Title>}
        placement="right"
        width={380}
        open={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        mask={false}
        style={{ position: 'absolute' }}
        getContainer={false}
      >
        {selectedNode?.type === 'llmNode' && (
          <LLMConfigPanel
            config={(selectedNode.data?.config as LLMConfig) || {} as LLMConfig}
            onChange={handleLLMConfigChange}
          />
        )}
        {selectedNode?.type === 'ttsNode' && (
          <TTSConfigPanel
            config={(selectedNode.data?.config as TTSConfig) || {} as TTSConfig}
            onChange={handleTTSConfigChange}
          />
        )}
        {selectedNode?.type === 'endNode' && (
          <EndConfigPanel
            config={(selectedNode.data?.config as EndConfig) || { outputParams: [], answerContent: '' }}
            upstreamNodes={upstreamNodes}
            onChange={handleEndConfigChange}
          />
        )}
      </Drawer>
    </div>
  );
};

export default FlowCanvasInner;
