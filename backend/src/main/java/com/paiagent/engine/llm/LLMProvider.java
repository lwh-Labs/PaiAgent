package com.paiagent.engine.llm;

/**
 * LLM 提供商接口（策略模式）
 * 不同的 LLM 服务商（OpenAI、DeepSeek、通义千问等）对应不同实现
 */
public interface LLMProvider {

    /**
     * 返回该提供商标识，对应节点配置中的 provider 字段
     * 例如："openai"、"deepseek"、"qwen"
     *
     * @return 提供商标识（小写）
     */
    String getProvider();

    /**
     * 调用 LLM 进行对话生成
     *
     * @param model        模型名称，例如 "gpt-4o"、"deepseek-chat"、"qwen-plus"
     * @param apiKey       API 密钥
     * @param systemPrompt 系统提示词
     * @param userMessage  用户消息（工作流中流转的文本）
     * @param temperature  采样温度，范围 0.0 ~ 2.0
     * @param maxTokens    最大输出 token 数
     * @return LLM 生成的回复文本
     * @throws RuntimeException 调用失败时抛出，包含错误描述
     */
    String chat(String model, String apiKey, String systemPrompt,
                String userMessage, double temperature, int maxTokens);
}
