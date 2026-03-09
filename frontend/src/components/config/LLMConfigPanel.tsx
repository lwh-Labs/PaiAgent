import React, { useEffect } from 'react';
import { Form, Input, Select, Slider, InputNumber, Typography, Button, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { LLMConfig, LLMInputParam, LLMOutputParam } from '../../types';
import type { Node } from 'reactflow';

const { Text } = Typography;
const { TextArea } = Input;

// 各 provider 对应的常用模型建议
const MODEL_SUGGESTIONS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  qwen: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
};

// 节点类型显示名称
const NODE_TYPE_LABELS: Record<string, string> = {
  startNode: '输入',
  llmNode: '大模型',
  ttsNode: '音频合成',
};

// 节点输出字段映射
const NODE_OUTPUT_FIELDS: Record<string, { value: string; label: string }[]> = {
  startNode: [{ value: 'text', label: '用户输入' }],
  llmNode: [{ value: 'text', label: 'LLM输出' }],
  ttsNode: [{ value: 'audioUrl', label: '音频URL' }],
};

interface LLMConfigPanelProps {
  config: LLMConfig;
  /** 画布上所有上游节点，用于生成引用下拉选项 */
  upstreamNodes?: Node[];
  /** 配置变更回调，实时同步到节点 data */
  onChange: (config: LLMConfig) => void;
}

/** LLM 节点配置面板 */
const LLMConfigPanel: React.FC<LLMConfigPanelProps> = ({ config, upstreamNodes = [], onChange }) => {
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

  // ===== 输入参数相关 =====
  const inputParams = config.inputParams || [];

  // 构建引用下拉选项：上游节点列表
  const referenceOptions = upstreamNodes.map((node) => ({
    value: node.id,
    label: `${NODE_TYPE_LABELS[node.type || ''] || node.type}（${node.id}）`,
  }));

  // 获取指定节点的输出字段选项
  const getOutputFieldOptions = (nodeId: string) => {
    const node = upstreamNodes.find((n) => n.id === nodeId);
    if (!node) return [];
    return NODE_OUTPUT_FIELDS[node.type || ''] || [{ value: 'text', label: '输出' }];
  };

  // 更新某个输入参数
  const updateInputParam = (index: number, patch: Partial<LLMInputParam>) => {
    const next = [...inputParams];
    next[index] = { ...next[index], ...patch };
    // 切换类型时清空 value 和 referenceField
    if (patch.type !== undefined && patch.type !== inputParams[index].type) {
      next[index].value = '';
      next[index].referenceField = undefined;
    }
    // 切换引用节点时，重置 referenceField
    if (patch.value !== undefined && inputParams[index].type === 'reference') {
      const fields = getOutputFieldOptions(patch.value);
      next[index].referenceField = fields[0]?.value || 'text';
    }
    onChange({ ...config, inputParams: next });
  };

  // 添加输入参数
  const addInputParam = () => {
    onChange({
      ...config,
      inputParams: [...inputParams, { name: '', type: 'input', value: '', referenceField: 'text' }],
    });
  };

  // 删除输入参数
  const removeInputParam = (index: number) => {
    const next = inputParams.filter((_, i) => i !== index);
    onChange({ ...config, inputParams: next });
  };

  // ===== 输出参数相关 =====
  const outputParams = config.outputParams || [];

  // 更新某个输出参数
  const updateOutputParam = (index: number, patch: Partial<LLMOutputParam>) => {
    const next = [...outputParams];
    next[index] = { ...next[index], ...patch };
    onChange({ ...config, outputParams: next });
  };

  // 添加输出参数
  const addOutputParam = () => {
    onChange({
      ...config,
      outputParams: [...outputParams, { name: '', type: 'string', description: '' }],
    });
  };

  // 删除输出参数
  const removeOutputParam = (index: number) => {
    const next = outputParams.filter((_, i) => i !== index);
    onChange({ ...config, outputParams: next });
  };

  return (
    <div>
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
          <TextArea
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

      <Divider />

      {/* ===== 输入参数配置 ===== */}
      <Text strong style={{ fontSize: 14 }}>输入参数</Text>
      <div style={{ marginTop: 12 }}>
        {inputParams.map((param, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 8,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            {/* 参数名 */}
            <Input
              placeholder="参数名"
              value={param.name}
              onChange={(e) => updateInputParam(index, { name: e.target.value })}
              style={{ width: 100 }}
              size="small"
            />

            {/* 参数类型 */}
            <Select
              value={param.type}
              onChange={(val) => updateInputParam(index, { type: val })}
              style={{ width: 80 }}
              size="small"
              options={[
                { value: 'input', label: '输入' },
                { value: 'reference', label: '引用' },
              ]}
            />

            {/* 值：输入模式为文本框，引用模式为下拉 */}
            {param.type === 'input' ? (
              <Input
                placeholder="输入值"
                value={param.value}
                onChange={(e) => updateInputParam(index, { value: e.target.value })}
                style={{ flex: 1, minWidth: 120 }}
                size="small"
              />
            ) : (
              <>
                {/* 引用节点选择 */}
                <Select
                  placeholder="选择节点"
                  value={param.value || undefined}
                  onChange={(val) => updateInputParam(index, { value: val })}
                  style={{ width: 140 }}
                  size="small"
                  options={referenceOptions}
                />
                {/* 引用字段选择 */}
                <Select
                  placeholder="选择字段"
                  value={param.referenceField || 'text'}
                  onChange={(val) => updateInputParam(index, { referenceField: val })}
                  style={{ width: 100 }}
                  size="small"
                  options={getOutputFieldOptions(param.value).map((f) => ({
                    value: f.value,
                    label: f.label,
                  }))}
                />
              </>
            )}

            {/* 删除按钮 */}
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => removeInputParam(index)}
            />
          </div>
        ))}

        <Button
          type="dashed"
          onClick={addInputParam}
          icon={<PlusOutlined />}
          size="small"
          block
        >
          添加输入参数
        </Button>
      </div>

      <Divider />

      {/* ===== 输出参数配置 ===== */}
      <Text strong style={{ fontSize: 14 }}>输出参数</Text>
      <div style={{ marginTop: 12 }}>
        {outputParams.map((param, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 8,
              alignItems: 'flex-start',
            }}
          >
            {/* 变量名 */}
            <Input
              placeholder="变量名"
              value={param.name}
              onChange={(e) => updateOutputParam(index, { name: e.target.value })}
              style={{ width: 100 }}
              size="small"
            />

            {/* 变量类型 */}
            <Select
              value={param.type}
              onChange={(val) => updateOutputParam(index, { type: val })}
              style={{ width: 90 }}
              size="small"
              options={[
                { value: 'string', label: 'string' },
              ]}
            />

            {/* 描述 */}
            <Input
              placeholder="描述（可选）"
              value={param.description || ''}
              onChange={(e) => updateOutputParam(index, { description: e.target.value })}
              style={{ flex: 1 }}
              size="small"
            />

            {/* 删除按钮 */}
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => removeOutputParam(index)}
            />
          </div>
        ))}

        <Button
          type="dashed"
          onClick={addOutputParam}
          icon={<PlusOutlined />}
          size="small"
          block
        >
          添加输出参数
        </Button>
      </div>
    </div>
  );
};

export default LLMConfigPanel;
