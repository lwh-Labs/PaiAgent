package com.paiagent.engine.handler;

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

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * TTS 节点处理器
 * 从上游获取文本输入，调用阿里云 DashScope CosyVoice API 合成音频，
 * 将音频文件保存到临时目录，并返回可访问的音频 URL
 */
@Slf4j
@Component
public class TTSNodeHandler implements NodeHandler {

    private static final String COSYVOICE_API_URL =
            "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2audio/generation";

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
            // 从上游获取输入文本
            String inputText = context.getUpstreamText(node.getId(), graph);
            if (inputText.isEmpty()) {
                throw new RuntimeException("TTS 节点没有获取到上游文本输入，nodeId=" + node.getId());
            }
            log.debug("TTS 节点输入文本长度: {}", inputText.length());

            // 读取节点配置
            String apiKey = node.getConfigString("apiKey", "");
            String voiceId = node.getConfigString("voiceId", "longxiaochun");
            double speed = node.getConfigDouble("speed", 1.0);
            double pitch = node.getConfigDouble("pitch", 1.0);
            String model = node.getConfigString("model", "cosyvoice-v1");

            if (apiKey.isEmpty()) {
                throw new RuntimeException("TTS 节点配置缺少 apiKey，nodeId=" + node.getId());
            }

            // 调用 CosyVoice API
            log.info("调用 CosyVoice TTS API, model={}, voiceId={}, nodeId={}", model, voiceId, node.getId());
            byte[] audioData = callCosyVoiceApi(apiKey, model, inputText, voiceId, speed, pitch);

            // 保存音频文件到临时目录
            String filename = UUID.randomUUID() + ".mp3";
            Path audioFilePath = saveAudioFile(filename, audioData);
            log.info("音频文件已保存, path={}, size={}字节", audioFilePath, audioData.length);

            // 构建音频访问 URL（对应 AudioController 提供的接口）
            String audioUrl = "/api/audio/" + filename;

            // 估算音频时长（粗略：假设 128kbps，1 字节 ≈ 8 bit，1s = 128*1024/8 字节）
            double durationSeconds = audioData.length / (128.0 * 1024 / 8);

            Map<String, Object> output = new HashMap<>();
            output.put("audioUrl", audioUrl);
            output.put("duration", Math.round(durationSeconds * 10.0) / 10.0);

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
     * 调用阿里云 DashScope CosyVoice API 合成音频
     *
     * @param apiKey   DashScope API Key
     * @param model    模型名称，如 "cosyvoice-v1"
     * @param text     待合成文本
     * @param voiceId  音色 ID
     * @param speed    语速
     * @param pitch    音调
     * @return 音频字节数据
     * @throws IOException 调用异常
     */
    private byte[] callCosyVoiceApi(String apiKey, String model, String text,
                                     String voiceId, double speed, double pitch) throws IOException {
        // 构建请求体
        ObjectNode root = objectMapper.createObjectNode();
        root.put("model", model);

        ObjectNode input = objectMapper.createObjectNode();
        input.put("text", text);
        root.set("input", input);

        ObjectNode parameters = objectMapper.createObjectNode();
        parameters.put("voice", voiceId);
        parameters.put("format", "mp3");
        parameters.put("speed", speed);
        parameters.put("pitch", pitch);
        root.set("parameters", parameters);

        String requestBodyStr = objectMapper.writeValueAsString(root);
        log.debug("CosyVoice 请求体: {}", requestBodyStr);

        Request request = new Request.Builder()
                .url(COSYVOICE_API_URL)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .post(RequestBody.create(requestBodyStr, JSON_MEDIA_TYPE))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "（响应体为空）";
                // 尝试解析错误信息
                String errorMsg;
                try {
                    JsonNode errorNode = objectMapper.readTree(errorBody);
                    JsonNode messageNode = errorNode.path("message");
                    errorMsg = messageNode.isMissingNode() ? errorBody : messageNode.asText();
                } catch (Exception e) {
                    errorMsg = errorBody;
                }
                throw new RuntimeException("CosyVoice API 调用失败，HTTP 状态码: "
                        + response.code() + "，错误信息: " + errorMsg);
            }

            // 检查响应 Content-Type，判断是否为音频数据
            String contentType = response.header("Content-Type", "");
            ResponseBody responseBody = response.body();
            if (responseBody == null) {
                throw new RuntimeException("CosyVoice API 返回响应体为空");
            }

            if (contentType.contains("audio") || contentType.contains("octet-stream")) {
                // 直接返回音频字节
                return responseBody.bytes();
            } else {
                // 可能是 JSON 格式，尝试解析音频 URL 或 base64
                String bodyStr = responseBody.string();
                log.debug("CosyVoice 响应（非音频格式）: {}", bodyStr);
                JsonNode respNode = objectMapper.readTree(bodyStr);

                // 尝试提取音频 URL（部分 API 返回 URL 而非直接字节）
                JsonNode outputNode = respNode.path("output");
                if (!outputNode.isMissingNode()) {
                    JsonNode audioNode = outputNode.path("audio");
                    if (!audioNode.isMissingNode()) {
                        String audioUrl = audioNode.asText();
                        return downloadAudio(audioUrl, apiKey);
                    }
                }

                throw new RuntimeException("CosyVoice API 响应格式无法解析，响应体: " + bodyStr);
            }
        }
    }

    /**
     * 下载音频文件
     *
     * @param audioUrl 音频 URL
     * @param apiKey   认证 API Key
     * @return 音频字节数据
     * @throws IOException 下载异常
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
     * 将音频字节数据保存到系统临时目录下的 paiagent-audio 子目录
     *
     * @param filename  文件名（含扩展名）
     * @param audioData 音频字节数据
     * @return 保存后的文件路径
     * @throws IOException 文件写入异常
     */
    private Path saveAudioFile(String filename, byte[] audioData) throws IOException {
        // 获取系统临时目录
        String tmpDir = System.getProperty("java.io.tmpdir");
        Path audioDir = Paths.get(tmpDir, AUDIO_DIR);

        // 确保目录存在
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
