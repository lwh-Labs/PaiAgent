package com.paiagent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * 工作流执行响应 DTO
 * 包含执行 ID、整体状态、各节点执行结果及最终输出
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExecuteResponse {

    /**
     * 执行记录 ID
     */
    private Long executionId;

    /**
     * 整体执行状态: SUCCESS / FAILED / RUNNING
     */
    private String status;

    /**
     * 各节点执行结果列表
     */
    private List<NodeResult> nodeResults;

    /**
     * 最终输出数据（来自结束节点上游的输出）
     */
    private Map<String, Object> finalOutput;

    /**
     * 错误信息（执行失败时）
     */
    private String errorMessage;
}
