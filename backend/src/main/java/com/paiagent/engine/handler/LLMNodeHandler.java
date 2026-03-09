package com.paiagent.engine.handler;

import com.paiagent.dto.NodeResult;
import com.paiagent.engine.ExecutionContext;
import com.paiagent.engine.NodeDefinition;
import com.paiagent.engine.NodeHandler;
import com.paiagent.engine.WorkflowGraph;
import com.paiagent.engine.llm.LLMProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * LLM 节点处理器
 * 从上游获取文本输入，根据节点配置调用对应的 LLM 服务（OpenAI/DeepSeek/通义千问），
 * 将 LLM 生成的文本作为节点输出
 */
@Slf4j
@Component
public class LLMNodeHandler implements NodeHandler {

    /**
     * LLM 提供商 Map，key 为 provider 标识（如 "openai"），value 为对应实现
     */
    private final Map<String, LLMProvider> providerMap;

    public LLMNodeHandler(List<LLMProvider> providers) {
        this.providerMap = new HashMap<>();
        for (LLMProvider provider : providers) {
            providerMap.put(provider.getProvider().toLowerCase(), provider);
        }
        log.info("LLMNodeHandler 初始化完成，已注册的 LLM 提供商: {}", providerMap.keySet());
    }

    @Override
    public String getType() {
        return "LLM";
    }

    @Override
    public NodeResult execute(NodeDefinition node, ExecutionContext context, WorkflowGraph graph) {
        LocalDateTime startTime = LocalDateTime.now();
        log.info("执行 LLM 节点, nodeId={}", node.getId());

        try {
            // 从上游获取输入文本
            String inputText = context.getUpstreamText(node.getId(), graph);
            if (inputText.isEmpty()) {
                // 若上游没有文本，则尝试使用用户原始输入
                inputText = context.getUserInput() != null ? context.getUserInput() : "";
            }
            log.debug("LLM 节点输入文本: {}", inputText);

            // 读取节点配置
            String provider = node.getConfigString("provider", "openai").toLowerCase();
            String model = node.getConfigString("model", "gpt-3.5-turbo");
            String apiKey = node.getConfigString("apiKey", "");
            String systemPrompt = node.getConfigString("systemPrompt", "");
            double temperature = node.getConfigDouble("temperature", 0.7);
            int maxTokens = node.getConfigInt("maxTokens", 2000);

            // 校验 apiKey
            if (apiKey.isEmpty()) {
                throw new RuntimeException("LLM 节点配置缺少 apiKey，nodeId=" + node.getId());
            }

            // 获取对应的 LLM 提供商
            LLMProvider llmProvider = providerMap.get(provider);
            if (llmProvider == null) {
                throw new RuntimeException("不支持的 LLM 提供商: " + provider
                        + "，已支持的提供商: " + providerMap.keySet());
            }

            log.info("调用 LLM, provider={}, model={}, nodeId={}", provider, model, node.getId());

            // 调用 LLM API
            String generatedText = llmProvider.chat(model, apiKey, systemPrompt, inputText, temperature, maxTokens);

            log.info("LLM 节点执行成功, nodeId={}, 输出文本长度={}", node.getId(), generatedText.length());

            Map<String, Object> output = new HashMap<>();
            output.put("text", generatedText);

            return NodeResult.builder()
                    .nodeId(node.getId())
                    .nodeType(node.getType())
                    .status("SUCCESS")
                    .output(output)
                    .startTime(startTime)
                    .endTime(LocalDateTime.now())
                    .build();

        } catch (Exception e) {
            log.error("LLM 节点执行失败, nodeId={}", node.getId(), e);
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
}
