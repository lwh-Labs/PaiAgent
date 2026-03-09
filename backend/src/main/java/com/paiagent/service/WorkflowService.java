package com.paiagent.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.paiagent.dto.WorkflowDTO;
import com.paiagent.entity.Workflow;
import com.paiagent.repository.WorkflowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 工作流业务逻辑服务
 * 提供工作流的 CRUD 操作，以及 API Key 脱敏处理
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowService {

    private final WorkflowRepository workflowRepository;
    private final ObjectMapper objectMapper;

    /**
     * 获取所有工作流列表（graphJson 中的 apiKey 已脱敏）
     */
    public List<WorkflowDTO> listWorkflows() {
        log.debug("查询所有工作流列表");
        return workflowRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * 根据 ID 获取工作流详情（graphJson 中的 apiKey 已脱敏）
     */
    public WorkflowDTO getWorkflow(Long id) {
        log.debug("查询工作流详情, id={}", id);
        Workflow workflow = workflowRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("工作流不存在, id=" + id));
        return toDTO(workflow);
    }

    /**
     * 根据 ID 获取原始工作流实体（不脱敏，供内部引擎调用）
     */
    public Workflow getWorkflowEntity(Long id) {
        return workflowRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("工作流不存在, id=" + id));
    }

    /**
     * 创建新工作流
     */
    @Transactional
    public WorkflowDTO createWorkflow(WorkflowDTO dto) {
        log.info("创建工作流: {}", dto.getName());
        Workflow workflow = new Workflow();
        workflow.setName(dto.getName());
        workflow.setDescription(dto.getDescription());
        workflow.setGraphJson(convertGraphJsonToString(dto.getGraphJson()));
        Workflow saved = workflowRepository.save(workflow);
        return toDTO(saved);
    }

    /**
     * 更新工作流
     */
    @Transactional
    public WorkflowDTO updateWorkflow(Long id, WorkflowDTO dto) {
        log.info("更新工作流, id={}", id);
        Workflow workflow = workflowRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("工作流不存在, id=" + id));
        workflow.setName(dto.getName());
        workflow.setDescription(dto.getDescription());
        workflow.setGraphJson(convertGraphJsonToString(dto.getGraphJson()));
        Workflow saved = workflowRepository.save(workflow);
        return toDTO(saved);
    }

    /**
     * 删除工作流
     */
    @Transactional
    public void deleteWorkflow(Long id) {
        log.info("删除工作流, id={}", id);
        if (!workflowRepository.existsById(id)) {
            throw new RuntimeException("工作流不存在, id=" + id);
        }
        workflowRepository.deleteById(id);
    }

    /**
     * 将 Workflow 实体转换为 DTO，并对 graphJson 中的 apiKey 进行脱敏处理
     */
    private WorkflowDTO toDTO(Workflow workflow) {
        WorkflowDTO dto = WorkflowDTO.builder()
                .id(workflow.getId())
                .name(workflow.getName())
                .description(workflow.getDescription())
                .createdAt(workflow.getCreatedAt())
                .updatedAt(workflow.getUpdatedAt())
                .build();

        // 解析 graphJson 并脱敏 apiKey
        if (workflow.getGraphJson() != null && !workflow.getGraphJson().isEmpty()) {
            try {
                JsonNode graphNode = objectMapper.readTree(workflow.getGraphJson());
                JsonNode maskedGraph = maskApiKeys(graphNode.deepCopy());
                dto.setGraphJson(maskedGraph);
            } catch (JsonProcessingException e) {
                log.warn("解析 graphJson 失败, workflowId={}, 原始内容将作为字符串返回", workflow.getId(), e);
                dto.setGraphJson(workflow.getGraphJson());
            }
        }
        return dto;
    }

    /**
     * 对 graphJson 中所有节点配置的 apiKey 字段进行脱敏
     * 将 apiKey 值替换为 "****"
     */
    private JsonNode maskApiKeys(JsonNode graphNode) {
        JsonNode nodes = graphNode.get("nodes");
        if (nodes != null && nodes.isArray()) {
            for (JsonNode node : nodes) {
                JsonNode config = node.get("config");
                if (config != null && config.isObject() && config.has("apiKey")) {
                    ((ObjectNode) config).put("apiKey", "****");
                }
            }
        }
        return graphNode;
    }

    /**
     * 将 graphJson 对象转为 JSON 字符串存储
     */
    private String convertGraphJsonToString(Object graphJson) {
        if (graphJson == null) {
            return null;
        }
        if (graphJson instanceof String) {
            return (String) graphJson;
        }
        try {
            return objectMapper.writeValueAsString(graphJson);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("graphJson 序列化失败", e);
        }
    }
}
