package com.paiagent.engine;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 边定义
 * 描述工作流 DAG 中两个节点之间的有向连接关系
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EdgeDefinition {

    /**
     * 边的唯一标识
     */
    private String id;

    /**
     * 源节点 ID（起点）
     */
    private String source;

    /**
     * 目标节点 ID（终点）
     */
    private String target;
}
