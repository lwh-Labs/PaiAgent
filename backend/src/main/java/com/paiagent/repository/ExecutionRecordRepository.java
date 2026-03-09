package com.paiagent.repository;

import com.paiagent.entity.ExecutionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 执行记录 JPA Repository
 * 提供执行记录的基本 CRUD 操作及按工作流 ID 查询
 */
@Repository
public interface ExecutionRecordRepository extends JpaRepository<ExecutionRecord, Long> {

    /**
     * 根据工作流 ID 查询执行记录列表，按开始时间倒序排列
     */
    List<ExecutionRecord> findByWorkflowIdOrderByStartedAtDesc(Long workflowId);
}
