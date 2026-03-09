package com.paiagent.repository;

import com.paiagent.entity.Workflow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 工作流 JPA Repository
 * 提供工作流的基本 CRUD 操作
 */
@Repository
public interface WorkflowRepository extends JpaRepository<Workflow, Long> {
}
