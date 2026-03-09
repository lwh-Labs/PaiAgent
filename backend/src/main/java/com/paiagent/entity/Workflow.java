package com.paiagent.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 工作流实体
 * 存储工作流的基本信息和流图配置（节点+连线+参数）
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "workflow")
public class Workflow {

    /**
     * 主键，自增
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 工作流名称
     */
    @Column(nullable = false, length = 255)
    private String name;

    /**
     * 工作流描述
     */
    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * 工作流图配置 JSON
     * 存储节点列表、连线列表及各节点参数
     */
    @Column(name = "graph_json", columnDefinition = "CLOB")
    private String graphJson;

    /**
     * 创建时间
     */
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * 最后更新时间
     */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
