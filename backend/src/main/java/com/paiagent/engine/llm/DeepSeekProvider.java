package com.paiagent.engine.llm;

import org.springframework.stereotype.Component;

/**
 * DeepSeek LLM 提供商
 * DeepSeek 兼容 OpenAI Chat Completions 接口格式，仅 baseUrl 不同
 */
@Component
public class DeepSeekProvider extends OpenAICompatibleProvider {

    private static final String BASE_URL = "https://api.deepseek.com/v1/chat/completions";

    @Override
    public String getProvider() {
        return "deepseek";
    }

    @Override
    protected String getBaseUrl() {
        return BASE_URL;
    }
}
