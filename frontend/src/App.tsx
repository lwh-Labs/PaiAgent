import React, { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { Button, Typography, Space, Tooltip, message, Modal, Input, List, Spin } from 'antd';
import { SaveOutlined, BugOutlined, FolderOpenOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useWorkflow } from './hooks/useWorkflow';
import NodePanel from './components/NodePanel';
import FlowCanvas from './components/FlowCanvas';
import DebugDrawer from './components/DebugDrawer';
import './styles/index.css';

const { Title, Text } = Typography;

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
    workflowName,
    saving,
    loading,
    workflowList,
    saveWorkflow,
    loadWorkflowById,
    refreshWorkflowList,
    createNewWorkflow,
    updateWorkflowName,
    applyNodeResults,
    resetNodeStatus,
    updateNodeConfig,
  } = useWorkflow();

  // 调试抽屉开关
  const [debugDrawerOpen, setDebugDrawerOpen] = useState(false);
  // 加载工作流弹窗
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  // 新建工作流弹窗
  const [newWorkflowModalOpen, setNewWorkflowModalOpen] = useState(false);
  // 新工作流名称
  const [newWorkflowName, setNewWorkflowName] = useState('');
  // 编辑工作流名称
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // 打开调试抽屉
  const handleOpenDebug = () => {
    if (!workflowId) {
      message.warning('请先保存工作流，再进行调试');
      return;
    }
    setDebugDrawerOpen(true);
  };

  // 打开加载弹窗
  const handleOpenLoadModal = async () => {
    await refreshWorkflowList();
    setLoadModalOpen(true);
  };

  // 加载选中的工作流
  const handleLoadWorkflow = async (id: number) => {
    await loadWorkflowById(id);
    setLoadModalOpen(false);
  };

  // 创建新工作流
  const handleCreateNewWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      message.warning('请输入工作流名称');
      return;
    }
    await createNewWorkflow(newWorkflowName.trim());
    setNewWorkflowName('');
    setNewWorkflowModalOpen(false);
  };

  // 开始编辑工作流名称
  const startEditingName = () => {
    setTempName(workflowName);
    setEditingName(true);
  };

  // 保存工作流名称
  const saveWorkflowName = async () => {
    if (tempName.trim() && tempName !== workflowName) {
      updateWorkflowName(tempName.trim());
      setEditingName(false);
      // 自动保存
      setTimeout(() => {
        saveWorkflow();
      }, 100);
    } else {
      setEditingName(false);
    }
  };

  return (
    <div className="app-layout">
      {/* ===== 顶部工具栏 ===== */}
      <header className="app-header">
        <div className="app-header-left">
          <Title level={4} style={{ margin: 0, color: '#fff' }}>
            AI Agent 工作流编辑器
          </Title>
          {/* 当前工作流名称 */}
          <div style={{ marginLeft: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            {editingName ? (
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={saveWorkflowName}
                onPressEnter={saveWorkflowName}
                autoFocus
                style={{ width: 200 }}
                size="small"
              />
            ) : (
              <>
                <Text style={{ color: '#fff', fontSize: 14 }}>{workflowName}</Text>
                <Tooltip title="编辑名称">
                  <EditOutlined
                    onClick={startEditingName}
                    style={{ color: '#fff', cursor: 'pointer', opacity: 0.7 }}
                  />
                </Tooltip>
              </>
            )}
          </div>
        </div>
        <div className="app-header-right">
          <Space>
            <Tooltip title="加载已保存的工作流">
              <Button
                icon={<FolderOpenOutlined />}
                onClick={handleOpenLoadModal}
                type="default"
                ghost
              >
                加载
              </Button>
            </Tooltip>
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

      {/* ===== 加载工作流弹窗 ===== */}
      <Modal
        title="加载工作流"
        open={loadModalOpen}
        onCancel={() => setLoadModalOpen(false)}
        footer={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setLoadModalOpen(false);
            setNewWorkflowModalOpen(true);
          }}>
            新建工作流
          </Button>
        }
        width={500}
      >
        <Spin spinning={loading}>
          {workflowList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
              暂无已保存的工作流
            </div>
          ) : (
            <List
              dataSource={workflowList}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      key="load"
                      type="link"
                      size="small"
                      onClick={() => handleLoadWorkflow(item.id!)}
                    >
                      加载
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={item.name}
                    description={item.description || `ID: ${item.id}`}
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Modal>

      {/* ===== 新建工作流弹窗 ===== */}
      <Modal
        title="新建工作流"
        open={newWorkflowModalOpen}
        onCancel={() => {
          setNewWorkflowModalOpen(false);
          setNewWorkflowName('');
        }}
        onOk={handleCreateNewWorkflow}
        confirmLoading={saving}
        okText="创建"
        cancelText="取消"
      >
        <Input
          placeholder="请输入工作流名称"
          value={newWorkflowName}
          onChange={(e) => setNewWorkflowName(e.target.value)}
          onPressEnter={handleCreateNewWorkflow}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default App;
