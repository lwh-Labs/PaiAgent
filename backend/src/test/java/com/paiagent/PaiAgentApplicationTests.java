package com.paiagent;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Spring Boot 应用启动测试
 * 使用 H2 内存数据库替代 MySQL 进行测试
 */
@SpringBootTest
@ActiveProfiles("test")
class PaiAgentApplicationTests {

    @Test
    void contextLoads() {
        // 验证 Spring 应用上下文能正常加载
    }
}
