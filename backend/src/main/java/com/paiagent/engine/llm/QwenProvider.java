package com.paiagent.engine.llm;

import org.springframework.stereotype.Component;

/**
 * 通义千问 LLM 提供商
 * 通义千问 DashScope 兼容 OpenAI Chat Completions 接口格式
 */
@Component
public class QwenProvider extends OpenAICompatibleProvider {

    private static final String BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

    @Override
    public String getProvider() {
        return "qwen";
    }

    @Override
    protected String getBaseUrl() {
        return BASE_URL;
    }
}
