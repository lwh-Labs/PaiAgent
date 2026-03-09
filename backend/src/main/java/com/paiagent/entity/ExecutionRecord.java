package com.paiagent.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 执行记录实体
 * 记录每次工作流执行的输入、输出、状态和耗时等信息
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "execution_record")
public class ExecutionRecord {

    /**
     * 主键，自增
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 关联的工作流 ID
     */
    @Column(name = "workflow_id", nullable = false)
    private Long workflowId;

    /**
     * 执行状态: RUNNING / SUCCESS / FAILED
     */
    @Column(nullable = false, length = 20)
    private String status;

    /**
     * 用户输入数据 JSON
     */
    @Column(name = "input_json", columnDefinition = "TEXT")
    private String inputJson;

    /**
     * 执行输出数据 JSON（含各节点结果）
     */
    @Column(name = "output_json", columnDefinition = "CLOB")
    private String outputJson;

    /**
     * 错误信息
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /**
     * 执行开始时间
     */
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    /**
     * 执行结束时间
     */
    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    /**
     * 执行总耗时（毫秒）
     */
    @Column(name = "duration_ms")
    private Integer durationMs;
}
