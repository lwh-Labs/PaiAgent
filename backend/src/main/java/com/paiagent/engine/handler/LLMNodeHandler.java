package com.paiagent.engine.handler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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

    private final ObjectMapper objectMapper = new ObjectMapper();

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

            // 构建输入文本（处理动态输入参数）
            String inputText = buildInputText(node, context, graph);

            log.info("调用 LLM, provider={}, model={}, nodeId={}", provider, model, node.getId());
            log.debug("LLM 节点输入文本: {}", inputText);

            // 调用 LLM API
            String generatedText = llmProvider.chat(model, apiKey, systemPrompt, inputText, temperature, maxTokens);

            log.info("LLM 节点执行成功, nodeId={}, 输出文本长度={}", node.getId(), generatedText.length());

            // 构建输出（处理动态输出参数）
            Map<String, Object> output = buildOutput(node, generatedText);

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

    /**
     * 构建输入文本
     * 根据配置的输入参数，从不同来源获取值并组合成提示词
     */
    @SuppressWarnings("unchecked")
    private String buildInputText(NodeDefinition node, ExecutionContext context, WorkflowGraph graph) {
        Map<String, Object> config = node.getConfig();
        if (config == null) {
            // 没有配置，使用默认行为
            return getDefaultInputText(node, context, graph);
        }

        Object inputParamsObj = config.get("inputParams");
        if (inputParamsObj == null) {
            // 没有配置输入参数，使用默认行为
            return getDefaultInputText(node, context, graph);
        }

        try {
            // 解析输入参数配置
            List<Map<String, Object>> inputParams = objectMapper.convertValue(
                    inputParamsObj,
                    new TypeReference<List<Map<String, Object>>>() {}
            );

            if (inputParams == null || inputParams.isEmpty()) {
                return getDefaultInputText(node, context, graph);
            }

            StringBuilder sb = new StringBuilder();
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

                if (name != null && !name.isEmpty() && !paramValue.isEmpty()) {
                    if (sb.length() > 0) {
                        sb.append("\n\n");
                    }
                    sb.append("【").append(name).append("】\n").append(paramValue);
                }
            }

            // 如果没有构建出任何内容，使用默认行为
            if (sb.length() == 0) {
                return getDefaultInputText(node, context, graph);
            }

            return sb.toString();

        } catch (Exception e) {
            log.warn("解析输入参数配置失败，使用默认行为: {}", e.getMessage());
            return getDefaultInputText(node, context, graph);
        }
    }

    /**
     * 获取默认输入文本（向后兼容）
     */
    private String getDefaultInputText(NodeDefinition node, ExecutionContext context, WorkflowGraph graph) {
        String inputText = context.getUpstreamText(node.getId(), graph);
        if (inputText.isEmpty()) {
            inputText = context.getUserInput() != null ? context.getUserInput() : "";
        }
        return inputText;
    }

    /**
     * 从引用节点获取值
     *
     * @param nodeId         引用的节点 ID
     * @param referenceField 引用的字段名
     * @param context        执行上下文
     * @return 引用字段的值
     */
    @SuppressWarnings("unchecked")
    private String getReferenceValue(String nodeId, String referenceField, ExecutionContext context) {
        Object nodeOutput = context.getNodeOutput(nodeId);
        if (nodeOutput == null) {
            log.warn("引用节点 {} 没有输出", nodeId);
            return "";
        }

        // 处理 START 节点的特殊输出格式
        if (nodeOutput instanceof String) {
            return (String) nodeOutput;
        }

        // 处理 Map 类型的输出
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
     * 构建输出
     * 根据配置的输出参数，构建节点输出数据
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> buildOutput(NodeDefinition node, String generatedText) {
        Map<String, Object> output = new HashMap<>();
        output.put("text", generatedText);  // 默认输出字段

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
                        // 目前所有输出都是 string 类型，直接使用 generatedText
                        output.put(name, generatedText);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("解析输出参数配置失败: {}", e.getMessage());
        }

        return output;
    }
}
