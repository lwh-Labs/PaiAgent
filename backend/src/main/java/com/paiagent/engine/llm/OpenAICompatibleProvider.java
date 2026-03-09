package com.paiagent.engine.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * OpenAI 兼容接口的抽象基类
 * DeepSeek 和通义千问均兼容 OpenAI Chat Completions 格式，
 * 子类只需指定不同的 baseUrl 即可复用此基类的调用逻辑
 */
@Slf4j
public abstract class OpenAICompatibleProvider implements LLMProvider {

    private static final MediaType JSON_MEDIA_TYPE = MediaType.get("application/json; charset=utf-8");

    /**
     * OkHttp 客户端（设置 LLM 专用超时：120 秒）
     */
    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 子类提供实际的 API 接口地址
     * 例如：https://api.openai.com/v1/chat/completions
     *
     * @return Chat Completions API 完整 URL
     */
    protected abstract String getBaseUrl();

    @Override
    public String chat(String model, String apiKey, String systemPrompt,
                       String userMessage, double temperature, int maxTokens) {
        log.info("调用 {} LLM API, model={}, provider={}", getProvider(), model, getProvider());

        // 构建请求体
        String requestBody = buildRequestBody(model, systemPrompt, userMessage, temperature, maxTokens);
        log.debug("LLM 请求体: {}", requestBody);

        Request request = new Request.Builder()
                .url(getBaseUrl())
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .post(RequestBody.create(requestBody, JSON_MEDIA_TYPE))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "（响应体为空）";
                log.error("{} API 调用失败, statusCode={}, errorBody={}", getProvider(), response.code(), errorBody);
                throw new RuntimeException(getProvider() + " API 调用失败，HTTP 状态码: " + response.code()
                        + "，错误信息: " + errorBody);
            }

            String responseBody = response.body() != null ? response.body().string() : "";
            log.debug("{} 响应体: {}", getProvider(), responseBody);
            return parseResponse(responseBody);

        } catch (IOException e) {
            log.error("{} API 网络调用异常", getProvider(), e);
            throw new RuntimeException(getProvider() + " API 网络调用异常: " + e.getMessage(), e);
        }
    }

    /**
     * 构建符合 OpenAI Chat Completions 格式的请求体 JSON 字符串
     */
    private String buildRequestBody(String model, String systemPrompt, String userMessage,
                                    double temperature, int maxTokens) {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("model", model);
            root.put("temperature", temperature);
            root.put("max_tokens", maxTokens);

            ArrayNode messages = objectMapper.createArrayNode();

            // 添加系统消息（如果有）
            if (systemPrompt != null && !systemPrompt.isBlank()) {
                ObjectNode sysMsg = objectMapper.createObjectNode();
                sysMsg.put("role", "system");
                sysMsg.put("content", systemPrompt);
                messages.add(sysMsg);
            }

            // 添加用户消息
            ObjectNode userMsg = objectMapper.createObjectNode();
            userMsg.put("role", "user");
            userMsg.put("content", userMessage);
            messages.add(userMsg);

            root.set("messages", messages);
            return objectMapper.writeValueAsString(root);

        } catch (Exception e) {
            throw new RuntimeException("构建 LLM 请求体失败", e);
        }
    }

    /**
     * 解析 OpenAI Chat Completions 格式的响应，提取 content 文本
     */
    private String parseResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode choices = root.get("choices");
            if (choices == null || !choices.isArray() || choices.isEmpty()) {
                throw new RuntimeException("LLM 响应格式异常，choices 为空。响应体: " + responseBody);
            }
            JsonNode message = choices.get(0).get("message");
            if (message == null) {
                throw new RuntimeException("LLM 响应格式异常，message 字段缺失。响应体: " + responseBody);
            }
            JsonNode content = message.get("content");
            if (content == null) {
                throw new RuntimeException("LLM 响应格式异常，content 字段缺失。响应体: " + responseBody);
            }
            return content.asText();

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("解析 LLM 响应失败: " + e.getMessage(), e);
        }
    }
}
