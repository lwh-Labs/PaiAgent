import React, { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { Button, Typography, Space, Tooltip, message } from 'antd';
import { SaveOutlined, BugOutlined } from '@ant-design/icons';
import { useWorkflow } from './hooks/useWorkflow';
import NodePanel from './components/NodePanel';
import FlowCanvas from './components/FlowCanvas';
import DebugDrawer from './components/DebugDrawer';
import './styles/index.css';

const { Title } = Typography;

/** 主应用组件 */
const App: React.FC = () => {
  const {
    nodes,
    edges,
    setNodes,
    onNodesChange,
    onEdgesChange,
    onConnect,
    workflowId,
    saving,
    saveWorkflow,
    applyNodeResults,
    resetNodeStatus,
    updateNodeConfig,
  } = useWorkflow();

  // 调试抽屉开关
  const [debugDrawerOpen, setDebugDrawerOpen] = useState(false);

  // 打开调试抽屉
  const handleOpenDebug = () => {
    if (!workflowId) {
      message.warning('请先保存工作流，再进行调试');
      return;
    }
    setDebugDrawerOpen(true);
  };

  return (
    <div className="app-layout">
      {/* ===== 顶部工具栏 ===== */}
      <header className="app-header">
        <div className="app-header-left">
          <Title level={4} style={{ margin: 0, color: '#fff' }}>
            AI Agent 工作流编辑器
          </Title>
        </div>
        <div className="app-header-right">
          <Space>
            <Tooltip title="保存当前工作流到后端">
              <Button
                icon={<SaveOutlined />}
                onClick={saveWorkflow}
                loading={saving}
                type="default"
                ghost
              >
                保存
              </Button>
            </Tooltip>
            <Tooltip title="打开调试面板，输入文字执行工作流">
              <Button
                icon={<BugOutlined />}
                onClick={handleOpenDebug}
                type="primary"
              >
                调试
              </Button>
            </Tooltip>
          </Space>
        </div>
      </header>

      {/* ===== 主体区域：左侧节点面板 + 中央画板 ===== */}
      <div className="app-body">
        {/* 左侧节点面板 */}
        <aside className="app-sidebar">
          <NodePanel />
        </aside>

        {/* 中央画板（ReactFlowProvider 包裹，使 useReactFlow 可用） */}
        <main className="app-canvas">
          <ReactFlowProvider>
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              setNodes={setNodes}
              onNodeConfigChange={(nodeId, config) =>
                updateNodeConfig(nodeId, config)
              }
            />
          </ReactFlowProvider>
        </main>
      </div>

      {/* ===== 调试抽屉 ===== */}
      <DebugDrawer
        open={debugDrawerOpen}
        onClose={() => setDebugDrawerOpen(false)}
        workflowId={workflowId}
        onExecuteStart={resetNodeStatus}
        onExecuteComplete={applyNodeResults}
      />
    </div>
  );
};

export default App;
