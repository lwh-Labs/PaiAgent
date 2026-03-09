package com.paiagent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 节点执行结果 DTO
 * 记录单个节点的执行状态、输入输出及耗时
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NodeResult {

    /**
     * 节点 ID
     */
    private String nodeId;

    /**
     * 节点类型: START / LLM / TTS / END
     */
    private String nodeType;

    /**
     * 节点执行状态: PENDING / RUNNING / SUCCESS / FAILED / SKIPPED
     */
    private String status;

    /**
     * 节点输出数据
     */
    private Map<String, Object> output;

    /**
     * 错误信息（节点执行失败时）
     */
    private String errorMessage;

    /**
     * 节点执行开始时间
     */
    private LocalDateTime startTime;

    /**
     * 节点执行结束时间
     */
    private LocalDateTime endTime;
}
