import { useState, useCallback, useEffect } from 'react';
import { useNodesState, useEdgesState, addEdge } from 'reactflow';
import type { Node, Edge, Connection } from 'reactflow';
import { message } from 'antd';
import { getWorkflows, createWorkflow, updateWorkflow } from '../api';
import type { WorkflowDTO, GraphData, NodeStatusMap, NodeResult } from '../types';

// 默认初始工作流（包含 START + END 节点）
const DEFAULT_NODES: Node[] = [
  {
    id: 'start-1',
    type: 'startNode',
    position: { x: 250, y: 80 },
    data: { status: 'default' },
  },
  {
    id: 'end-1',
    type: 'endNode',
    position: { x: 250, y: 400 },
    data: { status: 'default' },
  },
];

const DEFAULT_EDGES: Edge[] = [];

/** 将 React Flow 的 nodes/edges 转换为后端 graphJson 格式 */
const toGraphData = (nodes: Node[], edges: Edge[]): GraphData => ({
  nodes: nodes.map((n) => ({
    id: n.id,
    type: (n.type === 'startNode'
      ? 'START'
      : n.type === 'llmNode'
      ? 'LLM'
      : n.type === 'ttsNode'
      ? 'TTS'
      : 'END') as 'START' | 'LLM' | 'TTS' | 'END',
    position: n.position,
    config: (n.data?.config as Record<string, unknown>) || {},
  })),
  edges: edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  })),
});

/** 将后端 graphJson 格式转换为 React Flow 的 nodes/edges */
const fromGraphData = (graph: GraphData): { nodes: Node[]; edges: Edge[] } => {
  const typeMap: Record<string, string> = {
    START: 'startNode',
    LLM: 'llmNode',
    TTS: 'ttsNode',
    END: 'endNode',
  };
  return {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      type: typeMap[n.type] || 'startNode',
      position: n.position,
      data: {
        config: n.config,
        status: 'default' as const,
      },
    })),
    edges: graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
  };
};

/** 工作流状态管理 Hook */
export const useWorkflow = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_EDGES);

  // 当前工作流 ID（用于保存/执行）
  const [workflowId, setWorkflowId] = useState<number | null>(null);
  const [workflowName, setWorkflowName] = useState<string>('我的工作流');
  const [saving, setSaving] = useState(false);

  // 节点状态映射（调试时驱动节点视觉状态）
  const [nodeStatusMap, setNodeStatusMap] = useState<NodeStatusMap>({});

  // 页面加载时，从后端加载工作流
  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const workflows = await getWorkflows();
        if (workflows.length > 0) {
          // 加载第一个工作流
          const wf = workflows[0];
          setWorkflowId(wf.id!);
          setWorkflowName(wf.name);
          if (wf.graphJson) {
            const graph: GraphData = JSON.parse(wf.graphJson);
            const { nodes: loadedNodes, edges: loadedEdges } = fromGraphData(graph);
            if (loadedNodes.length > 0) {
              setNodes(loadedNodes);
              setEdges(loadedEdges);
            }
          }
        } else {
          // 没有工作流，自动创建一个默认工作流
          const defaultGraph = toGraphData(DEFAULT_NODES, DEFAULT_EDGES);
          const created = await createWorkflow({
            name: '我的工作流',
            description: 'AI 播客工作流',
            graphJson: JSON.stringify(defaultGraph),
          });
          setWorkflowId(created.id!);
          setWorkflowName(created.name);
        }
      } catch (err) {
        // 后端未启动时静默失败，不影响前端使用
        console.warn('加载工作流失败，使用默认工作流:', err);
      }
    };
    loadWorkflow();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 监听 nodeStatusMap 变化，更新 React Flow 节点的 data.status
  useEffect(() => {
    if (Object.keys(nodeStatusMap).length === 0) return;
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          status: nodeStatusMap[n.id] || 'default',
        },
      }))
    );
  }, [nodeStatusMap, setNodes]);

  /** 节点连线 */
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  /** 保存工作流到后端 */
  const saveWorkflow = useCallback(async () => {
    setSaving(true);
    try {
      const graphData = toGraphData(nodes, edges);
      const payload: WorkflowDTO = {
        name: workflowName,
        description: 'AI 播客工作流',
        graphJson: JSON.stringify(graphData),
      };
      if (workflowId) {
        await updateWorkflow(workflowId, payload);
      } else {
        const created = await createWorkflow(payload);
        setWorkflowId(created.id!);
      }
      message.success('工作流已保存');
    } catch (err) {
      message.error('保存失败，请检查后端服务是否启动');
      console.error('保存工作流失败:', err);
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, workflowId, workflowName]);

  /** 根据节点执行结果更新节点状态 */
  const applyNodeResults = useCallback((nodeResults: NodeResult[]) => {
    const statusMap: NodeStatusMap = {};
    nodeResults.forEach((result) => {
      if (result.status === 'SUCCESS') statusMap[result.nodeId] = 'success';
      else if (result.status === 'FAILED') statusMap[result.nodeId] = 'failed';
      else if (result.status === 'RUNNING') statusMap[result.nodeId] = 'running';
      else statusMap[result.nodeId] = 'default';
    });
    setNodeStatusMap(statusMap);
  }, []);

  /** 重置所有节点状态为默认 */
  const resetNodeStatus = useCallback(() => {
    setNodeStatusMap({});
  }, []);

  /** 更新指定节点的配置 */
  const updateNodeConfig = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config } }
            : n
        )
      );
    },
    [setNodes]
  );

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    workflowId,
    workflowName,
    saving,
    saveWorkflow,
    applyNodeResults,
    resetNodeStatus,
    updateNodeConfig,
  };
};
