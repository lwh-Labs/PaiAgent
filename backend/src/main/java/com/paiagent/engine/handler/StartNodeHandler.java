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
 * START 节点处理器
 * 从 ExecutionContext 获取用户输入，并将其作为节点输出传递给下游节点
 */
@Slf4j
@Component
public class StartNodeHandler implements NodeHandler {

    @Override
    public String getType() {
        return "START";
    }

    @Override
    public NodeResult execute(NodeDefinition node, ExecutionContext context, WorkflowGraph graph) {
        LocalDateTime startTime = LocalDateTime.now();
        log.info("执行 START 节点, nodeId={}", node.getId());

        // 直接将用户输入作为 START 节点的输出
        Map<String, Object> output = new HashMap<>();
        output.put("text", context.getUserInput() != null ? context.getUserInput() : "");

        LocalDateTime endTime = LocalDateTime.now();
        log.info("START 节点执行完成, nodeId={}, 输出文本长度={}", node.getId(),
                String.valueOf(output.get("text")).length());

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
