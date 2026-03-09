package com.paiagent.engine;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 工作流图
 * 由 graphJson 解析构建的 DAG（有向无环图），提供节点邻接关系查询、入度计算等基础方法
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowGraph {

    /**
     * 所有节点定义列表
     */
    private List<NodeDefinition> nodes;

    /**
     * 所有边定义列表
     */
    private List<EdgeDefinition> edges;

    /**
     * 根据节点 ID 获取节点定义
     *
     * @param nodeId 节点 ID
     * @return 节点定义，若不存在返回 null
     */
    public NodeDefinition getNodeById(String nodeId) {
        if (nodes == null) {
            return null;
        }
        return nodes.stream()
                .filter(n -> nodeId.equals(n.getId()))
                .findFirst()
                .orElse(null);
    }

    /**
     * 获取指定节点的所有直接后继节点 ID 列表
     *
     * @param nodeId 节点 ID
     * @return 后继节点 ID 列表（出边的目标节点）
     */
    public List<String> getSuccessors(String nodeId) {
        if (edges == null) {
            return Collections.emptyList();
        }
        return edges.stream()
                .filter(e -> nodeId.equals(e.getSource()))
                .map(EdgeDefinition::getTarget)
                .collect(Collectors.toList());
    }

    /**
     * 获取指定节点的所有直接前驱节点 ID 列表
     *
     * @param nodeId 节点 ID
     * @return 前驱节点 ID 列表（入边的源节点）
     */
    public List<String> getPredecessors(String nodeId) {
        if (edges == null) {
            return Collections.emptyList();
        }
        return edges.stream()
                .filter(e -> nodeId.equals(e.getTarget()))
                .map(EdgeDefinition::getSource)
                .collect(Collectors.toList());
    }

    /**
     * 计算图中每个节点的入度（有多少条边指向该节点）
     *
     * @return Map<节点ID, 入度>
     */
    public Map<String, Integer> computeInDegrees() {
        Map<String, Integer> inDegree = new HashMap<>();
        if (nodes != null) {
            for (NodeDefinition node : nodes) {
                inDegree.put(node.getId(), 0);
            }
        }
        if (edges != null) {
            for (EdgeDefinition edge : edges) {
                inDegree.merge(edge.getTarget(), 1, Integer::sum);
            }
        }
        return inDegree;
    }

    /**
     * 获取入度为 0 的所有起始节点
     *
     * @return 起始节点列表
     */
    public List<NodeDefinition> getStartNodes() {
        Map<String, Integer> inDegree = computeInDegrees();
        if (nodes == null) {
            return Collections.emptyList();
        }
        return nodes.stream()
                .filter(n -> inDegree.getOrDefault(n.getId(), 0) == 0)
                .collect(Collectors.toList());
    }

    /**
     * 获取所有 START 类型节点
     *
     * @return START 类型节点列表
     */
    public List<NodeDefinition> getNodesByType(String type) {
        if (nodes == null) {
            return Collections.emptyList();
        }
        return nodes.stream()
                .filter(n -> type.equals(n.getType()))
                .collect(Collectors.toList());
    }
}
