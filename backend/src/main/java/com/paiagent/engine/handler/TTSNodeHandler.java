package com.paiagent.engine.handler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.paiagent.dto.NodeResult;
import com.paiagent.engine.ExecutionContext;
import com.paiagent.engine.NodeDefinition;
import com.paiagent.engine.NodeHandler;
import com.paiagent.engine.WorkflowGraph;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.stereotype.Component;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * TTS 节点处理器
 * 从上游获取文本输入，调用超拟人 TTS API 合成音频，
 * 将音频文件保存到临时目录，并返回可访问的音频 URL
 */
@Slf4j
@Component
public class TTSNodeHandler implements NodeHandler {

    private static final String TTS_API_URL =
            "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

    private static final MediaType JSON_MEDIA_TYPE = MediaType.get("application/json; charset=utf-8");

    /**
     * 音频临时存储目录名称
     */
    private static final String AUDIO_DIR = "paiagent-audio";

    /**
     * OkHttp 客户端（TTS 专用超时：60 秒）
     */
    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String getType() {
        return "TTS";
    }

    @Override
    public NodeResult execute(NodeDefinition node, ExecutionContext context, WorkflowGraph graph) {
        LocalDateTime startTime = LocalDateTime.now();
        log.info("执行 TTS 节点, nodeId={}", node.getId());

        try {
            // 读取节点配置
            String apiKey = node.getConfigString("apiKey", "");
            String model = node.getConfigString("model", "qwen3-tts-flash");

            if (apiKey.isEmpty()) {
                throw new RuntimeException("TTS 节点配置缺少 apiKey，nodeId=" + node.getId());
            }

            // 从 inputParams 获取参数
            Map<String, String> inputValues = parseInputParams(node, context, graph);
            String text = inputValues.getOrDefault("text", "");
            String voice = inputValues.getOrDefault("voice", "Cherry");
            String languageType = inputValues.getOrDefault("language_type", "Auto");

            if (text.isEmpty()) {
                throw new RuntimeException("TTS 节点没有获取到文本输入，nodeId=" + node.getId());
            }

            log.info("调用超拟人 TTS API, model={}, voice={}, language_type={}, nodeId={}",
                    model, voice, languageType, node.getId());
            log.debug("TTS 节点输入文本长度: {}", text.length());

            // 调用 TTS API
            byte[] audioData = callTTSApi(apiKey, model, text, voice, languageType);

            // 保存音频文件到临时目录
            String filename = UUID.randomUUID() + ".mp3";
            Path audioFilePath = saveAudioFile(filename, audioData);
            log.info("音频文件已保存, path={}, size={}字节", audioFilePath, audioData.length);

            // 构建音频访问 URL（对应 AudioController 提供的接口）
            String audioUrl = "/api/audio/" + filename;

            // 估算音频时长（粗略：假设 128kbps，1 字节 ≈ 8 bit，1s = 128*1024/8 字节）
            double durationSeconds = audioData.length / (128.0 * 1024 / 8);

            // 构建输出
            Map<String, Object> output = buildOutput(node, audioUrl, durationSeconds);

            log.info("TTS 节点执行成功, nodeId={}, audioUrl={}, 预估时长={}s",
                    node.getId(), audioUrl, output.get("duration"));

            return NodeResult.builder()
                    .nodeId(node.getId())
                    .nodeType(node.getType())
                    .status("SUCCESS")
                    .output(output)
                    .startTime(startTime)
                    .endTime(LocalDateTime.now())
                    .build();

        } catch (Exception e) {
            log.error("TTS 节点执行失败, nodeId={}", node.getId(), e);
            return NodeResult.builder()
                    .nodeId(node.getId())
                    .nodeType(node.getType())
                    .status("FAILED")
                    .errorMessage(e.getMessage())
                    .startTime(startTime)
                    .endTime(LocalDateTime.now())
                    .build();
        }
    }

    /**
     * 解析输入参数配置，获取各参数值
     */
    @SuppressWarnings("unchecked")
    private Map<String, String> parseInputParams(NodeDefinition node, ExecutionContext context, WorkflowGraph graph) {
        Map<String, String> result = new HashMap<>();

        Map<String, Object> config = node.getConfig();
        if (config == null) {
            // 没有配置，使用默认行为（从上游获取文本）
            String defaultText = context.getUpstreamText(node.getId(), graph);
            if (defaultText.isEmpty()) {
                defaultText = context.getUserInput() != null ? context.getUserInput() : "";
            }
            result.put("text", defaultText);
            result.put("voice", "Cherry");
            result.put("language_type", "Auto");
            return result;
        }

        Object inputParamsObj = config.get("inputParams");
        if (inputParamsObj == null) {
            // 没有配置输入参数，使用默认行为
            String defaultText = context.getUpstreamText(node.getId(), graph);
            if (defaultText.isEmpty()) {
                defaultText = context.getUserInput() != null ? context.getUserInput() : "";
            }
            result.put("text", defaultText);
            result.put("voice", "Cherry");
            result.put("language_type", "Auto");
            return result;
        }

        try {
            List<Map<String, Object>> inputParams = objectMapper.convertValue(
                    inputParamsObj,
                    new TypeReference<List<Map<String, Object>>>() {}
            );

            if (inputParams != null) {
                for (Map<String, Object> param : inputParams) {
                    String name = (String) param.get("name");
                    String type = (String) param.get("type");
                    String value = (String) param.get("value");
                    String referenceField = (String) param.get("referenceField");

                    String paramValue = "";

                    if ("reference".equals(type) && value != null && !value.isEmpty()) {
                        // 引用类型：从上游节点获取值
                        paramValue = getReferenceValue(value, referenceField, context);
                    } else if ("input".equals(type) && value != null) {
                        // 输入类型：直接使用配置的值
                        paramValue = value;
                    }

                    if (name != null && !name.isEmpty()) {
                        result.put(name, paramValue);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("解析输入参数配置失败: {}", e.getMessage());
        }

        // 确保有默认值
        if (!result.containsKey("text")) {
            String defaultText = context.getUpstreamText(node.getId(), graph);
            if (defaultText.isEmpty()) {
                defaultText = context.getUserInput() != null ? context.getUserInput() : "";
            }
            result.put("text", defaultText);
        }
        if (!result.containsKey("voice")) {
            result.put("voice", "Cherry");
        }
        if (!result.containsKey("language_type")) {
            result.put("language_type", "Auto");
        }

        return result;
    }

    /**
     * 从引用节点获取值
     */
    @SuppressWarnings("unchecked")
    private String getReferenceValue(String nodeId, String referenceField, ExecutionContext context) {
        Object nodeOutput = context.getNodeOutput(nodeId);
        if (nodeOutput == null) {
            log.warn("引用节点 {} 没有输出", nodeId);
            return "";
        }

        if (nodeOutput instanceof String) {
            return (String) nodeOutput;
        }

        if (nodeOutput instanceof Map) {
            Map<String, Object> outputMap = (Map<String, Object>) nodeOutput;
            String field = referenceField != null ? referenceField : "text";
            Object value = outputMap.get(field);
            if (value != null) {
                return String.valueOf(value);
            }
        }

        log.warn("无法从节点 {} 获取字段 {} 的值", nodeId, referenceField);
        return "";
    }

    /**
     * 调用超拟人 TTS API 合成音频（DashScope multimodal-generation 接口）
     */
    private byte[] callTTSApi(String apiKey, String model, String text,
                               String voice, String languageType) throws IOException {
        // 构建 DashScope 原生格式请求体
        ObjectNode root = objectMapper.createObjectNode();
        root.put("model", model);

        ObjectNode input = objectMapper.createObjectNode();
        input.put("text", text);
        input.put("voice", voice);
        input.put("language_type", languageType);
        root.set("input", input);

        String requestBodyStr = objectMapper.writeValueAsString(root);
        log.debug("TTS 请求体: {}", requestBodyStr);

        Request request = new Request.Builder()
                .url(TTS_API_URL)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .post(RequestBody.create(requestBodyStr, JSON_MEDIA_TYPE))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "（响应体为空）";
                String errorMsg;
                try {
                    JsonNode errorNode = objectMapper.readTree(errorBody);
                    JsonNode messageNode = errorNode.path("message");
                    errorMsg = messageNode.isMissingNode() ? errorBody : messageNode.asText();
                } catch (Exception e) {
                    errorMsg = errorBody;
                }
                throw new RuntimeException("TTS API 调用失败，HTTP 状态码: "
                        + response.code() + "，错误信息: " + errorMsg);
            }

            String contentType = response.header("Content-Type", "");
            ResponseBody responseBody = response.body();
            if (responseBody == null) {
                throw new RuntimeException("TTS API 返回响应体为空");
            }

            if (contentType.contains("audio") || contentType.contains("octet-stream")) {
                // 直接返回音频字节流
                return responseBody.bytes();
            } else {
                // JSON 响应：解析 output.audio URL 并下载
                String bodyStr = responseBody.string();
                log.debug("TTS 响应（非音频格式）: {}", bodyStr);
                JsonNode respNode = objectMapper.readTree(bodyStr);

                JsonNode outputNode = respNode.path("output");
                if (!outputNode.isMissingNode()) {
                    JsonNode audioNode = outputNode.path("audio");
                    if (!audioNode.isMissingNode()) {
                        String audioUrl;
                        if (audioNode.isTextual()) {
                            // 直接是 URL 字符串
                            audioUrl = audioNode.asText();
                        } else if (audioNode.isObject()) {
                            // 是对象，取 url 字段
                            audioUrl = audioNode.path("url").asText();
                        } else {
                            audioUrl = "";
                        }
                        if (audioUrl != null && !audioUrl.isEmpty()) {
                            return downloadAudio(audioUrl, apiKey);
                        }
                    }
                }

                throw new RuntimeException("TTS API 响应格式无法解析，响应体: " + bodyStr);
            }
        }
    }

    /**
     * 下载音频文件
     */
    private byte[] downloadAudio(String audioUrl, String apiKey) throws IOException {
        log.debug("下载音频文件: {}", audioUrl);
        Request request = new Request.Builder()
                .url(audioUrl)
                .header("Authorization", "Bearer " + apiKey)
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new RuntimeException("下载音频文件失败，HTTP 状态码: " + response.code());
            }
            ResponseBody body = response.body();
            if (body == null) {
                throw new RuntimeException("音频文件下载响应体为空");
            }
            return body.bytes();
        }
    }

    /**
     * 构建输出数据
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> buildOutput(NodeDefinition node, String audioUrl, double durationSeconds) {
        Map<String, Object> output = new HashMap<>();
        output.put("audioUrl", audioUrl);
        output.put("duration", Math.round(durationSeconds * 10.0) / 10.0);

        Map<String, Object> config = node.getConfig();
        if (config == null) {
            return output;
        }

        Object outputParamsObj = config.get("outputParams");
        if (outputParamsObj == null) {
            return output;
        }

        try {
            List<Map<String, Object>> outputParams = objectMapper.convertValue(
                    outputParamsObj,
                    new TypeReference<List<Map<String, Object>>>() {}
            );

            if (outputParams != null && !outputParams.isEmpty()) {
                for (Map<String, Object> param : outputParams) {
                    String name = (String) param.get("name");
                    if (name != null && !name.isEmpty()) {
                        // voice_url 或其他变量名映射到 audioUrl
                        output.put(name, audioUrl);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("解析输出参数配置失败: {}", e.getMessage());
        }

        return output;
    }

    /**
     * 将音频字节数据保存到系统临时目录
     */
    private Path saveAudioFile(String filename, byte[] audioData) throws IOException {
        String tmpDir = System.getProperty("java.io.tmpdir");
        Path audioDir = Paths.get(tmpDir, AUDIO_DIR);

        if (!Files.exists(audioDir)) {
            Files.createDirectories(audioDir);
            log.info("创建音频临时目录: {}", audioDir);
        }

        Path filePath = audioDir.resolve(filename);
        try (FileOutputStream fos = new FileOutputStream(filePath.toFile())) {
            fos.write(audioData);
        }
        return filePath;
    }
}
