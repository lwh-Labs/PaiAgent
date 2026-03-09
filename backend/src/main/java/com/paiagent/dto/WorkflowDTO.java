package com.paiagent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 工作流请求/响应 DTO
 * 用于创建、更新和查询工作流时的数据传输
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowDTO {

    private Long id;

    /**
     * 工作流名称
     */
    private String name;

    /**
     * 工作流描述
     */
    private String description;

    /**
     * 工作流图配置 JSON（节点+连线+参数）
     * 注意：GET 返回时，其中的 apiKey 字段会被脱敏为 ****
     */
    private Object graphJson;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
