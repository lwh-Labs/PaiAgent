package com.paiagent.engine.handler;

import com.paiagent.dto.NodeResult;
import com.paiagent.engine.ExecutionContext;
import com.paiagent.engine.NodeDefinition;
import com.paiagent.engine.NodeHandler;
import com.paiagent.engine.WorkflowGraph;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * END 节点处理器
 * 汇聚所有上游节点输出，作为工作流的最终结果返回
 */
@Slf4j
@Component
public class EndNodeHandler implements NodeHandler {

    @Override
    public String getType() {
        return "END";
    }

    @Override
    public NodeResult execute(NodeDefinition node, ExecutionContext context, WorkflowGraph graph) {
        LocalDateTime startTime = LocalDateTime.now();
        log.info("执行 END 节点, nodeId={}", node.getId());

        // 收集所有上游节点的输出
        Map<String, Object> upstreamOutputs = context.getUpstreamOutputs(node.getId(), graph);
        Map<String, Object> output = new HashMap<>(upstreamOutputs);

        LocalDateTime endTime = LocalDateTime.now();
        log.info("END 节点执行完成, nodeId={}, 上游节点数量={}", node.getId(), upstreamOutputs.size());

        return NodeResult.builder()
                .nodeId(node.getId())
                .nodeType(node.getType())
                .status("SUCCESS")
                .output(output)
                .startTime(startTime)
                .endTime(endTime)
                .build();
    }
}
