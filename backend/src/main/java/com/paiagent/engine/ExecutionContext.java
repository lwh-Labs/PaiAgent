package com.paiagent.engine;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 工作流执行上下文
 * 在 DAG 各节点间传递数据，保存每个节点的输出结果，支持上游数据汇聚查询
 */
public class ExecutionContext {

    /**
     * 存储各节点的输出数据，key 为节点 ID，value 为该节点的输出内容
     */
    private final Map<String, Object> nodeOutputs = new HashMap<>();

    /**
     * 用户原始输入文字
     */
    private final String userInput;

    /**
     * 构造执行上下文
     *
     * @param userInput 用户输入文字
     */
    public ExecutionContext(String userInput) {
        this.userInput = userInput;
    }

    /**
     * 获取用户输入文字
     *
     * @return 用户输入
     */
    public String getUserInput() {
        return userInput;
    }

    /**
     * 获取指定节点的输出
     *
     * @param nodeId 节点 ID
     * @return 节点输出对象，若未设置则返回 null
     */
    public Object getNodeOutput(String nodeId) {
        return nodeOutputs.get(nodeId);
    }

    /**
     * 设置指定节点的输出
     *
     * @param nodeId 节点 ID
     * @param output 节点输出数据
     */
    public void setNodeOutput(String nodeId, Object output) {
        nodeOutputs.put(nodeId, output);
    }

    /**
     * 获取指定节点的所有上游节点输出，以 Map 形式返回合并结果
     * key 为上游节点 ID，value 为该上游节点的输出
     *
     * @param nodeId 当前节点 ID
     * @param graph  工作流图，用于查询前驱节点
     * @return 上游节点 ID -> 上游节点输出 的映射
     */
    public Map<String, Object> getUpstreamOutputs(String nodeId, WorkflowGraph graph) {
        List<String> predecessors = graph.getPredecessors(nodeId);
        if (predecessors == null || predecessors.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, Object> result = new HashMap<>();
        for (String predId : predecessors) {
            Object output = nodeOutputs.get(predId);
            if (output != null) {
                result.put(predId, output);
            }
        }
        return result;
    }

    /**
     * 从上游节点输出中提取第一个找到的文本字段（"text" key）
     * 方便 LLM/TTS 节点快速获取输入文本
     *
     * @param nodeId 当前节点 ID
     * @param graph  工作流图
     * @return 上游节点输出中的文本内容，若未找到则返回空字符串
     */
    @SuppressWarnings("unchecked")
    public String getUpstreamText(String nodeId, WorkflowGraph graph) {
        Map<String, Object> upstreamOutputs = getUpstreamOutputs(nodeId, graph);
        for (Object output : upstreamOutputs.values()) {
            if (output instanceof Map) {
                Object text = ((Map<String, Object>) output).get("text");
                if (text != null && !String.valueOf(text).isEmpty()) {
                    return String.valueOf(text);
                }
            }
        }
        return "";
    }

    /**
     * 获取所有节点的输出副本（只读）
     *
     * @return 节点输出 Map 的不可修改视图
     */
    public Map<String, Object> getAllNodeOutputs() {
        return Collections.unmodifiableMap(nodeOutputs);
    }
}
