import { useState, useCallback, useEffect } from 'react';
import { useNodesState, useEdgesState, addEdge } from 'reactflow';
import type { Node, Edge, Connection } from 'reactflow';
import { message } from 'antd';
import { getWorkflows, getWorkflow, createWorkflow, updateWorkflow } from '../api';
import type { WorkflowDTO, GraphData, NodeStatusMap, NodeResult } from '../types';

// 默认初始工作流（包含 START + END 节点）
const DEFAULT_NODES: Node[] = [
  {
    id: 'start-1',
    type: 'startNode',
    position: { x: 250, y: 80 },
    data: { status: 'default' },
    deletable: false, // 输入节点不可删除
  },
  {
    id: 'end-1',
    type: 'endNode',
    position: { x: 250, y: 400 },
    data: { status: 'default' },
    deletable: false, // 输出节点不可删除
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

  const nodes = graph.nodes.map((n) => ({
    id: n.id,
    type: typeMap[n.type] || 'startNode',
    position: n.position,
    data: {
      config: n.config,
      status: 'default' as const,
    },
    // START 和 END 节点不可删除
    deletable: n.type !== 'START' && n.type !== 'END',
  }));

  // 确保始终有 START 和 END 节点
  const hasStart = nodes.some((n) => n.type === 'startNode');
  const hasEnd = nodes.some((n) => n.type === 'endNode');

  if (!hasStart) {
    nodes.unshift({
      id: 'start-1',
      type: 'startNode',
      position: { x: 250, y: 80 },
      data: { config: {}, status: 'default' },
      deletable: false,
    });
  }

  if (!hasEnd) {
    nodes.push({
      id: 'end-1',
      type: 'endNode',
      position: { x: 250, y: 400 },
      data: { config: {}, status: 'default' },
      deletable: false,
    });
  }

  return {
    nodes,
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
  const [loading, setLoading] = useState(false);
  const [workflowList, setWorkflowList] = useState<WorkflowDTO[]>([]);

  // 节点状态映射（调试时驱动节点视觉状态）
  const [nodeStatusMap, setNodeStatusMap] = useState<NodeStatusMap>({});

  /** 从 URL 获取工作流 ID */
  const getWorkflowIdFromUrl = useCallback((): number | null => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('workflowId');
    return id ? parseInt(id, 10) : null;
  }, []);

  /** 更新 URL 中的工作流 ID */
  const updateUrlWithWorkflowId = useCallback((id: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('workflowId', String(id));
    window.history.replaceState({}, '', url.toString());
  }, []);

  /** 加载指定工作流 */
  const loadWorkflowById = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const wf = await getWorkflow(id);
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
      updateUrlWithWorkflowId(wf.id!);
    } catch (err) {
      message.error('加载工作流失败');
      console.error('加载工作流失败:', err);
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges, updateUrlWithWorkflowId]);

  // 页面加载时，从 URL 或后端加载工作流
  useEffect(() => {
    const loadInitialWorkflow = async () => {
      try {
        // 优先从 URL 读取工作流 ID
        const urlWorkflowId = getWorkflowIdFromUrl();
        if (urlWorkflowId) {
          await loadWorkflowById(urlWorkflowId);
          return;
        }

        // URL 中没有 ID，加载工作流列表
        const workflows = await getWorkflows();
        setWorkflowList(workflows);

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
          updateUrlWithWorkflowId(wf.id!);
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
          updateUrlWithWorkflowId(created.id!);
        }
      } catch (err) {
        // 后端未启动时静默失败，不影响前端使用
        console.warn('加载工作流失败，使用默认工作流:', err);
      }
    };
    loadInitialWorkflow();
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
        updateUrlWithWorkflowId(created.id!);
      }
      // 更新 URL
      if (workflowId) {
        updateUrlWithWorkflowId(workflowId);
      }
      message.success('工作流已保存');
    } catch (err) {
      message.error('保存失败，请检查后端服务是否启动');
      console.error('保存工作流失败:', err);
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, workflowId, workflowName, updateUrlWithWorkflowId]);

  /** 刷新工作流列表 */
  const refreshWorkflowList = useCallback(async () => {
    try {
      const workflows = await getWorkflows();
      setWorkflowList(workflows);
    } catch (err) {
      console.error('获取工作流列表失败:', err);
    }
  }, []);

  /** 创建新工作流 */
  const createNewWorkflow = useCallback(async (name: string) => {
    try {
      const defaultGraph = toGraphData(DEFAULT_NODES, DEFAULT_EDGES);
      const created = await createWorkflow({
        name,
        description: 'AI 播客工作流',
        graphJson: JSON.stringify(defaultGraph),
      });
      setWorkflowId(created.id!);
      setWorkflowName(created.name);
      setNodes(DEFAULT_NODES);
      setEdges(DEFAULT_EDGES);
      updateUrlWithWorkflowId(created.id!);
      await refreshWorkflowList();
      message.success('新工作流已创建');
    } catch (err) {
      message.error('创建工作流失败');
      console.error('创建工作流失败:', err);
    }
  }, [setNodes, setEdges, updateUrlWithWorkflowId, refreshWorkflowList]);

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

  /** 更新工作流名称 */
  const updateWorkflowName = useCallback((name: string) => {
    setWorkflowName(name);
  }, []);

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
  };
};
