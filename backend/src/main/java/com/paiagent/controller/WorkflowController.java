package com.paiagent.controller;

import com.paiagent.dto.WorkflowDTO;
import com.paiagent.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 工作流管理 Controller
 * 提供工作流的 CRUD RESTful API
 */
@Slf4j
@RestController
@RequestMapping("/api/workflows")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;

    /**
     * 获取工作流列表
     * GET /api/workflows
     */
    @GetMapping
    public ResponseEntity<List<WorkflowDTO>> listWorkflows() {
        log.debug("收到请求: 获取工作流列表");
        List<WorkflowDTO> workflows = workflowService.listWorkflows();
        return ResponseEntity.ok(workflows);
    }

    /**
     * 获取单个工作流详情
     * GET /api/workflows/{id}
     * 注意：返回的 graphJson 中 apiKey 已脱敏
     */
    @GetMapping("/{id}")
    public ResponseEntity<WorkflowDTO> getWorkflow(@PathVariable Long id) {
        log.debug("收到请求: 获取工作流详情, id={}", id);
        WorkflowDTO workflow = workflowService.getWorkflow(id);
        return ResponseEntity.ok(workflow);
    }

    /**
     * 创建工作流
     * POST /api/workflows
     */
    @PostMapping
    public ResponseEntity<WorkflowDTO> createWorkflow(@RequestBody WorkflowDTO dto) {
        log.debug("收到请求: 创建工作流, name={}", dto.getName());
        WorkflowDTO created = workflowService.createWorkflow(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * 更新工作流
     * PUT /api/workflows/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<WorkflowDTO> updateWorkflow(@PathVariable Long id, @RequestBody WorkflowDTO dto) {
        log.debug("收到请求: 更新工作流, id={}", id);
        WorkflowDTO updated = workflowService.updateWorkflow(id, dto);
        return ResponseEntity.ok(updated);
    }

    /**
     * 删除工作流
     * DELETE /api/workflows/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkflow(@PathVariable Long id) {
        log.debug("收到请求: 删除工作流, id={}", id);
        workflowService.deleteWorkflow(id);
        return ResponseEntity.noContent().build();
    }
}
