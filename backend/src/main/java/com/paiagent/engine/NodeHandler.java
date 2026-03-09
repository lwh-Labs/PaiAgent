package com.paiagent.engine;

import com.paiagent.dto.NodeResult;

/**
 * 节点处理器接口（策略模式）
 * 每种节点类型对应一个具体实现，由 DAGEngine 按节点类型路由到对应处理器
 */
public interface NodeHandler {

    /**
     * 返回该处理器负责的节点类型（大写），如 "START"、"LLM"、"TTS"、"END"
     *
     * @return 节点类型字符串
     */
    String getType();

    /**
     * 执行节点逻辑
     *
     * @param node    当前节点定义（包含 id、type、config）
     * @param context 执行上下文（包含上游输出和用户输入）
     * @param graph   工作流图（用于查询前驱/后继关系）
     * @return 节点执行结果（包含状态、输出、时间等信息）
     */
    NodeResult execute(NodeDefinition node, ExecutionContext context, WorkflowGraph graph);
}
