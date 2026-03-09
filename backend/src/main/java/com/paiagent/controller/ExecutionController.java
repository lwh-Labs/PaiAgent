package com.paiagent.controller;

import com.paiagent.dto.ExecuteRequest;
import com.paiagent.dto.ExecuteResponse;
import com.paiagent.entity.ExecutionRecord;
import com.paiagent.service.ExecutionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 工作流执行 Controller
 * 提供工作流执行触发和执行记录查询 API
 */
@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ExecutionController {

    private final ExecutionService executionService;

    /**
     * 执行工作流
     * POST /api/workflows/{id}/execute
     * 当前为 mock 实现，后续由工作流引擎接管
     */
    @PostMapping("/workflows/{id}/execute")
    public ResponseEntity<ExecuteResponse> executeWorkflow(
            @PathVariable Long id,
            @RequestBody ExecuteRequest request) {
        log.info("收到请求: 执行工作流, workflowId={}", id);
        ExecuteResponse response = executionService.executeWorkflow(id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 获取执行记录详情
     * GET /api/executions/{executionId}
     */
    @GetMapping("/executions/{executionId}")
    public ResponseEntity<ExecutionRecord> getExecution(@PathVariable Long executionId) {
        log.debug("收到请求: 获取执行记录, executionId={}", executionId);
        ExecutionRecord record = executionService.getExecutionRecord(executionId);
        return ResponseEntity.ok(record);
    }

    /**
     * 获取指定工作流的执行记录列表
     * GET /api/workflows/{id}/executions
     */
    @GetMapping("/workflows/{id}/executions")
    public ResponseEntity<List<ExecutionRecord>> getWorkflowExecutions(@PathVariable Long id) {
        log.debug("收到请求: 获取工作流执行记录列表, workflowId={}", id);
        List<ExecutionRecord> records = executionService.getExecutionsByWorkflowId(id);
        return ResponseEntity.ok(records);
    }
}
