package com.paiagent.engine.llm;

import org.springframework.stereotype.Component;

/**
 * OpenAI LLM 提供商
 * 调用 OpenAI 官方 Chat Completions API
 */
@Component
public class OpenAIProvider extends OpenAICompatibleProvider {

    private static final String BASE_URL = "https://api.openai.com/v1/chat/completions";

    @Override
    public String getProvider() {
        return "openai";
    }

    @Override
    protected String getBaseUrl() {
        return BASE_URL;
    }
}
