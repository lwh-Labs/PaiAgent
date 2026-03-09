package com.paiagent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * 工作流执行请求 DTO
 * 包含用户输入数据，触发工作流执行
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExecuteRequest {

    /**
     * 用户输入数据
     * 例如：{ "text": "请介绍一下人工智能的发展历程" }
     */
    private Map<String, Object> input;
}
