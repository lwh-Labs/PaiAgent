import React, { useEffect } from 'react';
import { Form, Input, Select, Slider, InputNumber, Typography } from 'antd';
import type { LLMConfig } from '../../types';

const { Text } = Typography;

// 各 provider 对应的常用模型建议
const MODEL_SUGGESTIONS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  qwen: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
};

interface LLMConfigPanelProps {
  config: LLMConfig;
  /** 配置变更回调，实时同步到节点 data */
  onChange: (config: LLMConfig) => void;
}

/** LLM 节点配置面板 */
const LLMConfigPanel: React.FC<LLMConfigPanelProps> = ({ config, onChange }) => {
  const [form] = Form.useForm<LLMConfig>();

  // 当外部 config 变化时，同步到表单
  useEffect(() => {
    form.setFieldsValue(config);
  }, [config, form]);

  // 表单字段变化时，回调最新值
  const handleValuesChange = (_: Partial<LLMConfig>, allValues: LLMConfig) => {
    onChange(allValues);
  };

  const currentProvider = Form.useWatch('provider', form) || config.provider || 'openai';
  const modelOptions = MODEL_SUGGESTIONS[currentProvider] || [];

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={Object.assign({ provider: 'openai', temperature: 0.7, maxTokens: 2048 }, config)}
      onValuesChange={handleValuesChange}
      size="small"
    >
      {/* LLM 提供商选择 */}
      <Form.Item label="提供商" name="provider" rules={[{ required: true, message: '请选择提供商' }]}>
        <Select>
          <Select.Option value="openai">OpenAI</Select.Option>
          <Select.Option value="deepseek">DeepSeek</Select.Option>
          <Select.Option value="qwen">通义千问</Select.Option>
        </Select>
      </Form.Item>

      {/* 模型名称（带常用建议） */}
      <Form.Item label="模型名称" name="model" rules={[{ required: true, message: '请输入模型名称' }]}>
        <Select
          mode="tags"
          maxCount={1}
          placeholder="输入或选择模型名称"
          options={modelOptions.map((m) => ({ value: m, label: m }))}
          onChange={(val) => {
            // tags 模式返回数组，取第一个
            const modelVal = Array.isArray(val) ? val[val.length - 1] : val;
            form.setFieldValue('model', modelVal);
            onChange({ ...form.getFieldsValue(), model: modelVal });
          }}
        />
      </Form.Item>

      {/* API 密钥（密码输入框） */}
      <Form.Item label="API Key" name="apiKey" rules={[{ required: true, message: '请输入 API Key' }]}>
        <Input.Password placeholder="sk-..." autoComplete="off" />
      </Form.Item>

      {/* 系统提示词 */}
      <Form.Item label="系统提示词（System Prompt）" name="systemPrompt">
        <Input.TextArea
          rows={4}
          placeholder="你是一位专业的播客主持人，请将用户输入的内容转化为自然流畅的播客脚本。"
        />
      </Form.Item>

      {/* 生成温度 */}
      <Form.Item label={<>Temperature <Text type="secondary">(0~2，默认 0.7)</Text></>} name="temperature">
        <Slider min={0} max={2} step={0.1} marks={{ 0: '0', 1: '1', 2: '2' }} />
      </Form.Item>

      {/* 最大 Token 数 */}
      <Form.Item label="Max Tokens（默认 2048）" name="maxTokens">
        <InputNumber min={256} max={32768} step={256} style={{ width: '100%' }} />
      </Form.Item>
    </Form>
  );
};

export default LLMConfigPanel;
