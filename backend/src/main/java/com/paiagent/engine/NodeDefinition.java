package com.paiagent.engine;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * 节点定义
 * 存储从 graphJson 中解析出来的单个节点信息，包含节点 ID、类型及其配置参数
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NodeDefinition {

    /**
     * 节点唯一标识
     */
    private String id;

    /**
     * 节点类型：START / LLM / TTS / END
     */
    private String type;

    /**
     * 节点配置参数
     * 不同类型节点的具体配置字段不同，例如：
     * LLM 节点：provider, model, apiKey, systemPrompt, temperature, maxTokens
     * TTS 节点：apiKey, voiceId, speed, pitch
     */
    private Map<String, Object> config;

    /**
     * 获取指定配置项的字符串值
     *
     * @param key          配置项键
     * @param defaultValue 缺省值
     * @return 配置项的字符串表示，若不存在则返回 defaultValue
     */
    public String getConfigString(String key, String defaultValue) {
        if (config == null || !config.containsKey(key)) {
            return defaultValue;
        }
        Object val = config.get(key);
        return val != null ? String.valueOf(val) : defaultValue;
    }

    /**
     * 获取指定配置项的 double 值
     *
     * @param key          配置项键
     * @param defaultValue 缺省值
     * @return 配置项的 double 值，解析失败则返回 defaultValue
     */
    public double getConfigDouble(String key, double defaultValue) {
        if (config == null || !config.containsKey(key)) {
            return defaultValue;
        }
        Object val = config.get(key);
        if (val == null) {
            return defaultValue;
        }
        try {
            return Double.parseDouble(String.valueOf(val));
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    /**
     * 获取指定配置项的 int 值
     *
     * @param key          配置项键
     * @param defaultValue 缺省值
     * @return 配置项的 int 值，解析失败则返回 defaultValue
     */
    public int getConfigInt(String key, int defaultValue) {
        if (config == null || !config.containsKey(key)) {
            return defaultValue;
        }
        Object val = config.get(key);
        if (val == null) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(String.valueOf(val));
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}
