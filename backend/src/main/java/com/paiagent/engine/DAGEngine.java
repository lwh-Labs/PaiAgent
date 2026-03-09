package com.paiagent.engine;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paiagent.dto.ExecuteResponse;
import com.paiagent.dto.NodeResult;
import com.paiagent.engine.handler.EndNodeHandler;
import com.paiagent.engine.handler.LLMNodeHandler;
import com.paiagent.engine.handler.StartNodeHandler;
import com.paiagent.engine.handler.TTSNodeHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * DAG 工作流引擎（核心）
 * 负责：DAG 合法性校验、Kahn 算法拓扑排序、节点调度执行、结果汇聚
 */
@Slf4j
@Component
public class DAGEngine {

    /**
     * 节点处理器注册表，key 为节点类型（大写）
     */
    private final Map<String, NodeHandler> handlerMap;

    private final ObjectMapper objectMapper;

    public DAGEngine(StartNodeHandler startNodeHandler,
                     EndNodeHandler endNodeHandler,
                     LLMNodeHandler llmNodeHandler,
                     TTSNodeHandler ttsNodeHandler,
                     ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.handlerMap = new HashMap<>();
        registerHandler(startNodeHandler);
        registerHandler(endNodeHandler);
        registerHandler(llmNodeHandler);
        registerHandler(ttsNodeHandler);
        log.info("DAGEngine 初始化完成，已注册节点处理器: {}", handlerMap.keySet());
    }

    /**
     * 注册节点处理器
     */
    private void registerHandler(NodeHandler handler) {
        handlerMap.put(handler.getType().toUpperCase(), handler);
    }

    /**
     * 解析 graphJson 字符串为 WorkflowGraph
     *
     * @param graphJson 工作流图 JSON 字符串
     * @return 解析后的 WorkflowGraph
     * @throws RuntimeException 解析失败时抛出
     */
    public WorkflowGraph parseGraph(String graphJson) {
        if (graphJson == null || graphJson.isBlank()) {
            throw new RuntimeException("工作流图配置（graphJson）为空，无法执行");
        }
        try {
            Map<String, Object> graphMap = objectMapper.readValue(graphJson,
                    new TypeReference<Map<String, Object>>() {});

            // 解析 nodes
            List<NodeDefinition> nodes = new ArrayList<>();
            Object nodesObj = graphMap.get("nodes");
            if (nodesObj instanceof List) {
                for (Object nodeObj : (List<?>) nodesObj) {
                    String nodeJson = objectMapper.writeValueAsString(nodeObj);
                    nodes.add(objectMapper.readValue(nodeJson, NodeDefinition.class));
                }
            }

            // 解析 edges
            List<EdgeDefinition> edges = new ArrayList<>();
            Object edgesObj = graphMap.get("edges");
            if (edgesObj instanceof List) {
                for (Object edgeObj : (List<?>) edgesObj) {
                    String edgeJson = objectMapper.writeValueAsString(edgeObj);
                    edges.add(objectMapper.readValue(edgeJson, EdgeDefinition.class));
                }
            }

            return WorkflowGraph.builder()
                    .nodes(nodes)
                    .edges(edges)
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("解析 graphJson 失败: " + e.getMessage(), e);
        }
    }

    /**
     * 执行工作流
     *
     * @param graph     工作流图
     * @param userInput 用户输入文本
     * @return 执行响应（包含所有节点结果和最终输出）
     */
    public ExecuteResponse execute(WorkflowGraph graph, String userInput) {
        log.info("开始执行 DAG 工作流, 节点数={}, 边数={}, 用户输入长度={}",
                graph.getNodes() != null ? graph.getNodes().size() : 0,
                graph.getEdges() != null ? graph.getEdges().size() : 0,
                userInput != null ? userInput.length() : 0);

        // 1. 校验 DAG 合法性
        try {
            validateDAG(graph);
        } catch (Exception e) {
            log.error("DAG 校验失败: {}", e.getMessage());
            return ExecuteResponse.builder()
                    .status("FAILED")
                    .nodeResults(Collections.emptyList())
                    .errorMessage("工作流图校验失败: " + e.getMessage())
                    .build();
        }

        // 2. 拓扑排序
        List<String> topoOrder;
        try {
            topoOrder = topologicalSort(graph);
        } catch (Exception e) {
            log.error("拓扑排序失败: {}", e.getMessage());
            return ExecuteResponse.builder()
                    .status("FAILED")
                    .nodeResults(Collections.emptyList())
                    .errorMessage("工作流拓扑排序失败: " + e.getMessage())
                    .build();
        }
        log.info("拓扑排序结果: {}", topoOrder);

        // 3. 创建执行上下文
        ExecutionContext context = new ExecutionContext(userInput);

        // 4. 按拓扑顺序依次执行节点
        List<NodeResult> nodeResults = new ArrayList<>();
        boolean hasFailed = false;
        String failedNodeId = null;

        for (String nodeId : topoOrder) {
            NodeDefinition node = graph.getNodeById(nodeId);
            if (node == null) {
                log.warn("拓扑排序中的节点 {} 在图中未找到定义，跳过", nodeId);
                continue;
            }

            // 如果已有节点失败，标记后续节点为 SKIPPED
            if (hasFailed) {
                log.info("由于节点 {} 已失败，跳过节点: {}", failedNodeId, nodeId);
                nodeResults.add(NodeResult.builder()
                        .nodeId(nodeId)
                        .nodeType(node.getType())
                        .status("SKIPPED")
                        .build());
                continue;
            }

            // 获取节点处理器
            NodeHandler handler = handlerMap.get(node.getType().toUpperCase());
            if (handler == null) {
                log.error("未找到节点类型 {} 的处理器，nodeId={}", node.getType(), nodeId);
                NodeResult failedResult = NodeResult.builder()
                        .nodeId(nodeId)
                        .nodeType(node.getType())
                        .status("FAILED")
                        .errorMessage("未找到节点类型 [" + node.getType() + "] 的处理器")
                        .build();
                nodeResults.add(failedResult);
                hasFailed = true;
                failedNodeId = nodeId;
                continue;
            }

            // 执行节点
            log.info("开始执行节点: nodeId={}, type={}", nodeId, node.getType());
            NodeResult result = handler.execute(node, context, graph);
            nodeResults.add(result);

            // 将节点输出存入上下文
            if ("SUCCESS".equals(result.getStatus()) && result.getOutput() != null) {
                context.setNodeOutput(nodeId, result.getOutput());
            }

            // 检查执行结果
            if ("FAILED".equals(result.getStatus())) {
                log.error("节点执行失败, nodeId={}, errorMessage={}", nodeId, result.getErrorMessage());
                hasFailed = true;
                failedNodeId = nodeId;
            } else {
                log.info("节点执行成功, nodeId={}", nodeId);
            }
        }

        // 5. 汇聚最终输出
        Map<String, Object> finalOutput = buildFinalOutput(graph, context, nodeResults);

        // 6. 构建响应
        String overallStatus = hasFailed ? "FAILED" : "SUCCESS";
        String errorMessage = hasFailed
                ? "节点 [" + failedNodeId + "] 执行失败，工作流终止"
                : null;

        log.info("工作流执行完成, 整体状态={}, 执行节点数={}", overallStatus, nodeResults.size());

        return ExecuteResponse.builder()
                .status(overallStatus)
                .nodeResults(nodeResults)
                .finalOutput(finalOutput)
                .errorMessage(errorMessage)
                .build();
    }

    /**
     * 使用 Kahn 算法对 DAG 进行拓扑排序
     *
     * @param graph 工作流图
     * @return 按拓扑顺序排列的节点 ID 列表
     * @throws RuntimeException 存在环路时抛出
     */
    private List<String> topologicalSort(WorkflowGraph graph) {
        // 计算每个节点的入度
        Map<String, Integer> inDegree = graph.computeInDegrees();

        // 初始化队列：将所有入度为 0 的节点入队
        Queue<String> queue = new LinkedList<>();
        for (Map.Entry<String, Integer> entry : inDegree.entrySet()) {
            if (entry.getValue() == 0) {
                queue.offer(entry.getKey());
            }
        }

        List<String> result = new ArrayList<>();
        while (!queue.isEmpty()) {
            String nodeId = queue.poll();
            result.add(nodeId);

            // 减少后继节点入度，入度变为 0 时入队
            for (String successor : graph.getSuccessors(nodeId)) {
                int newDegree = inDegree.merge(successor, -1, Integer::sum);
                if (newDegree == 0) {
                    queue.offer(successor);
                }
            }
        }

        // 若排序结果数量小于节点总数，说明存在环路
        int totalNodes = graph.getNodes() != null ? graph.getNodes().size() : 0;
        if (result.size() < totalNodes) {
            throw new RuntimeException("工作流图中存在环路（循环依赖），无法执行。"
                    + "已排序节点数=" + result.size() + "，总节点数=" + totalNodes);
        }

        return result;
    }

    /**
     * 校验 DAG 合法性
     * 要求：必须有 START 节点、必须有 END 节点、节点数量大于 0、不存在环路（由拓扑排序保证）
     *
     * @param graph 工作流图
     * @throws RuntimeException 校验失败时抛出
     */
    private void validateDAG(WorkflowGraph graph) {
        if (graph.getNodes() == null || graph.getNodes().isEmpty()) {
            throw new RuntimeException("工作流图节点列表为空");
        }

        // 检查是否有 START 节点
        List<NodeDefinition> startNodes = graph.getNodesByType("START");
        if (startNodes.isEmpty()) {
            throw new RuntimeException("工作流图缺少 START 类型节点");
        }
        if (startNodes.size() > 1) {
            log.warn("工作流图包含多个 START 节点，数量={}", startNodes.size());
        }

        // 检查是否有 END 节点
        List<NodeDefinition> endNodes = graph.getNodesByType("END");
        if (endNodes.isEmpty()) {
            throw new RuntimeException("工作流图缺少 END 类型节点");
        }

        log.debug("DAG 校验通过, START 节点数={}, END 节点数={}, 总节点数={}",
                startNodes.size(), endNodes.size(), graph.getNodes().size());
    }

    /**
     * 构建最终输出
     * 从 END 节点的上下文输出中获取最终结果
     *
     * @param graph      工作流图
     * @param context    执行上下文
     * @param nodeResults 所有节点执行结果
     * @return 最终输出 Map
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> buildFinalOutput(WorkflowGraph graph, ExecutionContext context,
                                                  List<NodeResult> nodeResults) {
        // 优先从 END 节点的输出获取
        List<NodeDefinition> endNodes = graph.getNodesByType("END");
        for (NodeDefinition endNode : endNodes) {
            Object endOutput = context.getNodeOutput(endNode.getId());
            if (endOutput instanceof Map) {
                return (Map<String, Object>) endOutput;
            }
        }

        // 若 END 节点无输出，则收集所有成功节点的输出
        Map<String, Object> fallback = new HashMap<>();
        for (NodeResult result : nodeResults) {
            if ("SUCCESS".equals(result.getStatus()) && result.getOutput() != null) {
                fallback.put(result.getNodeId(), result.getOutput());
            }
        }
        return fallback;
    }
}
