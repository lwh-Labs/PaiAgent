package com.paiagent.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paiagent.dto.ExecuteRequest;
import com.paiagent.dto.ExecuteResponse;
import com.paiagent.engine.DAGEngine;
import com.paiagent.engine.WorkflowGraph;
import com.paiagent.entity.ExecutionRecord;
import com.paiagent.entity.Workflow;
import com.paiagent.repository.ExecutionRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 工作流执行业务逻辑服务
 * 负责编排工作流执行流程：获取工作流配置 -> 解析 DAG -> 调用引擎 -> 持久化执行记录
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExecutionService {

    private final ExecutionRecordRepository executionRecordRepository;
    private final WorkflowService workflowService;
    private final ObjectMapper objectMapper;
    private final DAGEngine dagEngine;

    /**
     * 执行工作流
     *
     * @param workflowId 工作流 ID
     * @param request    执行请求（包含用户输入）
     * @return 执行响应（包含各节点结果和最终输出）
     */
    @Transactional
    public ExecuteResponse executeWorkflow(Long workflowId, ExecuteRequest request) {
        log.info("开始执行工作流, workflowId={}", workflowId);

        // 1. 获取工作流实体（原始 graphJson，未脱敏，包含真实 apiKey）
        Workflow workflow = workflowService.getWorkflowEntity(workflowId);

        // 记录执行开始
        LocalDateTime startTime = LocalDateTime.now();
        long startMs = System.currentTimeMillis();

        // 2. 创建执行记录（初始状态为 RUNNING）
        ExecutionRecord record = ExecutionRecord.builder()
                .workflowId(workflowId)
                .status("RUNNING")
                .inputJson(toJsonString(request.getInput()))
                .startedAt(startTime)
                .build();
        record = executionRecordRepository.save(record);

        ExecuteResponse response;
        try {
            // 3. 解析 graphJson 为 WorkflowGraph
            log.info("解析工作流图, workflowId={}", workflowId);
            WorkflowGraph graph = dagEngine.parseGraph(workflow.getGraphJson());

            // 4. 提取用户输入文本
            String userInput = "";
            if (request.getInput() != null && request.getInput().containsKey("text")) {
                userInput = String.valueOf(request.getInput().get("text"));
            }

            // 5. 调用 DAGEngine 执行工作流
            response = dagEngine.execute(graph, userInput);

            // 6. 填充执行记录 ID
            response = ExecuteResponse.builder()
                    .executionId(record.getId())
                    .status(response.getStatus())
                    .nodeResults(response.getNodeResults())
                    .finalOutput(response.getFinalOutput())
                    .errorMessage(response.getErrorMessage())
                    .build();

        } catch (Exception e) {
            log.error("工作流执行异常, workflowId={}", workflowId, e);
            response = ExecuteResponse.builder()
                    .executionId(record.getId())
                    .status("FAILED")
                    .nodeResults(Collections.emptyList())
                    .errorMessage("工作流执行异常: " + e.getMessage())
                    .build();
        }

        // 7. 更新执行记录
        long durationMs = System.currentTimeMillis() - startMs;
        record.setStatus(response.getStatus());
        record.setFinishedAt(LocalDateTime.now());
        record.setDurationMs((int) durationMs);
        record.setOutputJson(toJsonString(response));
        executionRecordRepository.save(record);

        log.info("工作流执行完成, workflowId={}, executionId={}, 状态={}, 耗时={}ms",
                workflowId, record.getId(), response.getStatus(), durationMs);

        return response;
    }

    /**
     * 获取执行记录详情
     */
    public ExecutionRecord getExecutionRecord(Long executionId) {
        log.debug("查询执行记录, executionId={}", executionId);
        return executionRecordRepository.findById(executionId)
                .orElseThrow(() -> new RuntimeException("执行记录不存在, executionId=" + executionId));
    }

    /**
     * 获取指定工作流的执行记录列表
     */
    public List<ExecutionRecord> getExecutionsByWorkflowId(Long workflowId) {
        log.debug("查询工作流执行记录列表, workflowId={}", workflowId);
        return executionRecordRepository.findByWorkflowIdOrderByStartedAtDesc(workflowId);
    }

    /**
     * 将对象序列化为 JSON 字符串
     */
    private String toJsonString(Object obj) {
        if (obj == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.warn("JSON 序列化失败", e);
            return obj.toString();
        }
    }
}
