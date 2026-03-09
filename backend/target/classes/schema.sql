-- ========================================
-- AI Agent 工作流平台 - 数据库初始化脚本
-- 数据库名: ai_agent_workflow
-- ========================================

-- 创建数据库（如不存在）
CREATE DATABASE IF NOT EXISTS `ai_agent_workflow`
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE `ai_agent_workflow`;

-- ========================================
-- 工作流配置表
-- ========================================
CREATE TABLE IF NOT EXISTS `workflow` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
    `name`        VARCHAR(255) NOT NULL                COMMENT '工作流名称',
    `description` TEXT                                 COMMENT '工作流描述',
    `graph_json`  LONGTEXT                             COMMENT '工作流图配置（节点+连线+参数的 JSON）',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流配置表';

-- ========================================
-- 执行记录表
-- ========================================
CREATE TABLE IF NOT EXISTS `execution_record` (
    `id`            BIGINT      NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
    `workflow_id`   BIGINT      NOT NULL                COMMENT '关联工作流 ID',
    `status`        VARCHAR(20) NOT NULL                COMMENT '执行状态: RUNNING / SUCCESS / FAILED',
    `input_json`    TEXT                                 COMMENT '用户输入数据 JSON',
    `output_json`   LONGTEXT                             COMMENT '执行输出数据 JSON（含各节点结果）',
    `error_message` TEXT                                 COMMENT '失败时的错误信息',
    `started_at`    DATETIME                             COMMENT '执行开始时间',
    `finished_at`   DATETIME                             COMMENT '执行结束时间',
    `duration_ms`   INT                                  COMMENT '执行总耗时（毫秒）',
    PRIMARY KEY (`id`),
    INDEX `idx_workflow_id` (`workflow_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='执行记录表';
