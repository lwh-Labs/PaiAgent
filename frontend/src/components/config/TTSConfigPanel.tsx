import React, { useEffect, useMemo } from 'react';
import { Form, Input, Select, Typography, Divider, Button } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { TTSConfig, TTSInputParam, TTSOutputParam } from '../../types';
import type { Node } from 'reactflow';

const { Text } = Typography;

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

// 音色选项
const VOICE_OPTIONS = [
  { value: 'Cherry', label: 'Cherry' },
  { value: 'Serena', label: 'Serena' },
  { value: 'Ethan', label: 'Ethan' },
];

// 语言类型选项
const LANGUAGE_TYPE_OPTIONS = [
  { value: 'Auto', label: 'Auto（自动检测）' },
];

interface TTSConfigPanelProps {
  config: TTSConfig;
  /** 画布上所有上游节点，用于生成引用下拉选项 */
  upstreamNodes?: Node[];
  /** 配置变更回调，实时同步到节点 data */
  onChange: (config: TTSConfig) => void;
}

/** TTS 节点配置面板（超拟人音频合成） */
const TTSConfigPanel: React.FC<TTSConfigPanelProps> = ({ config, upstreamNodes = [], onChange }) => {
  const [form] = Form.useForm<TTSConfig>();

  // 当外部 config 变化时，同步到表单
  useEffect(() => {
    form.setFieldsValue(config);
  }, [config, form]);

  // 表单字段变化时，回调最新值
  const handleValuesChange = (_: Partial<TTSConfig>, allValues: TTSConfig) => {
    onChange(allValues);
  };

  // ===== 输入参数相关 =====
  const inputParams = config.inputParams || [];

  // 构建引用下拉选项：上游节点列表
  const referenceOptions = useMemo(
    () => upstreamNodes.map((node) => ({
      value: node.id,
      label: `${NODE_TYPE_LABELS[node.type || ''] || node.type}（${node.id}）`,
    })),
    [upstreamNodes]
  );

  // 获取指定节点的输出字段选项
  const getOutputFieldOptions = (nodeId: string) => {
    const node = upstreamNodes.find((n) => n.id === nodeId);
    if (!node) return [{ value: 'text', label: '输出' }];
    return NODE_OUTPUT_FIELDS[node.type || ''] || [{ value: 'text', label: '输出' }];
  };

  // 更新某个输入参数
  const updateInputParam = (index: number, patch: Partial<TTSInputParam>) => {
    const next = [...inputParams];
    next[index] = { ...next[index], ...patch };
    // 切换类型时清空 value 和 referenceField
    if (patch.type !== undefined && patch.type !== inputParams[index]?.type) {
      next[index] = { ...next[index], value: '', referenceField: 'text' };
    }
    onChange({ ...config, inputParams: next });
  };

  // ===== 输出参数相关 =====
  const outputParams = config.outputParams || [];

  // 更新某个输出参数
  const updateOutputParam = (index: number, patch: Partial<TTSOutputParam>) => {
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

  // 获取 text 参数
  const textParam = inputParams.find(p => p.name === 'text');
  const textType = textParam?.type || 'input';
  const textValue = textParam?.value || '';
  const textReferenceField = textParam?.referenceField || 'text';

  return (
    <div>
      {/* ===== 基本配置 ===== */}
      <Text strong style={{ fontSize: 14 }}>基本配置</Text>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ model: 'qwen3-tts-flash', ...config }}
        onValuesChange={handleValuesChange}
        size="small"
      >
        {/* API Key */}
        <Form.Item label="API Key" name="apiKey" rules={[{ required: true, message: '请输入 API Key' }]}>
          <Input.Password placeholder="输入 API Key" autoComplete="off" />
        </Form.Item>

        {/* 模型名称 */}
        <Form.Item label="模型名称" name="model" rules={[{ required: true, message: '请输入模型名称' }]}>
          <Input placeholder="qwen3-tts-flash" />
        </Form.Item>
      </Form>

      <Divider />

      {/* ===== 输入配置 ===== */}
      <Text strong style={{ fontSize: 14 }}>输入配置</Text>
      <div style={{ marginTop: 12 }}>
        {/* text 参数 */}
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>text（待合成文本）</Text>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Select
              value={textType}
              onChange={(val) => {
                const idx = inputParams.findIndex(p => p.name === 'text');
                if (idx >= 0) {
                  updateInputParam(idx, { type: val });
                } else {
                  onChange({
                    ...config,
                    inputParams: [...inputParams, { name: 'text', type: val, value: '', referenceField: 'text' }],
                  });
                }
              }}
              style={{ width: 80 }}
              size="small"
              options={[
                { value: 'input', label: '输入' },
                { value: 'reference', label: '引用' },
              ]}
            />
            {textType === 'input' ? (
              <Input
                placeholder="输入文本内容"
                value={textValue}
                onChange={(e) => {
                  const idx = inputParams.findIndex(p => p.name === 'text');
                  if (idx >= 0) {
                    updateInputParam(idx, { value: e.target.value });
                  } else {
                    onChange({
                      ...config,
                      inputParams: [...inputParams, { name: 'text', type: 'input', value: e.target.value, referenceField: 'text' }],
                    });
                  }
                }}
                style={{ flex: 1 }}
                size="small"
              />
            ) : (
              <>
                <Select
                  placeholder="选择节点"
                  value={textValue || undefined}
                  onChange={(val) => {
                    const fields = getOutputFieldOptions(val);
                    const idx = inputParams.findIndex(p => p.name === 'text');
                    if (idx >= 0) {
                      updateInputParam(idx, { value: val, referenceField: fields[0]?.value || 'text' });
                    } else {
                      onChange({
                        ...config,
                        inputParams: [...inputParams, { name: 'text', type: 'reference', value: val, referenceField: fields[0]?.value || 'text' }],
                      });
                    }
                  }}
                  style={{ width: 140 }}
                  size="small"
                  options={referenceOptions}
                />
                <Select
                  placeholder="选择字段"
                  value={textReferenceField}
                  onChange={(val) => {
                    const idx = inputParams.findIndex(p => p.name === 'text');
                    if (idx >= 0) {
                      updateInputParam(idx, { referenceField: val });
                    }
                  }}
                  style={{ width: 100 }}
                  size="small"
                  options={getOutputFieldOptions(textValue).map(f => ({
                    value: f.value,
                    label: f.label,
                  }))}
                />
              </>
            )}
          </div>
        </div>

        {/* voice 参数 */}
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>voice（音色）</Text>
          <div style={{ marginTop: 4 }}>
            <Select
              value={inputParams.find(p => p.name === 'voice')?.value || 'Cherry'}
              onChange={(val) => {
                const idx = inputParams.findIndex(p => p.name === 'voice');
                if (idx >= 0) {
                  updateInputParam(idx, { value: val });
                } else {
                  onChange({
                    ...config,
                    inputParams: [...inputParams, { name: 'voice', type: 'input', value: val, referenceField: '' }],
                  });
                }
              }}
              style={{ width: '100%' }}
              size="small"
              options={VOICE_OPTIONS}
            />
          </div>
        </div>

        {/* language_type 参数 */}
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>language_type（语言类型）</Text>
          <div style={{ marginTop: 4 }}>
            <Select
              value={inputParams.find(p => p.name === 'language_type')?.value || 'Auto'}
              onChange={(val) => {
                const idx = inputParams.findIndex(p => p.name === 'language_type');
                if (idx >= 0) {
                  updateInputParam(idx, { value: val });
                } else {
                  onChange({
                    ...config,
                    inputParams: [...inputParams, { name: 'language_type', type: 'input', value: val, referenceField: '' }],
                  });
                }
              }}
              style={{ width: '100%' }}
              size="small"
              options={LANGUAGE_TYPE_OPTIONS}
            />
          </div>
        </div>
      </div>

      <Divider />

      {/* ===== 输出配置 ===== */}
      <Text strong style={{ fontSize: 14 }}>输出配置</Text>
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
              style={{ width: 120 }}
              size="small"
            />

            {/* 变量类型 */}
            <Select
              value={param.type}
              onChange={(val) => updateOutputParam(index, { type: val })}
              style={{ width: 80 }}
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

        {/* 快捷添加 voice_url */}
        {outputParams.length === 0 && (
          <Button
            type="link"
            size="small"
            style={{ padding: '4px 0', marginTop: 4 }}
            onClick={() => {
              onChange({
                ...config,
                outputParams: [{ name: 'voice_url', type: 'string', description: '音频文件URL' }],
              });
            }}
          >
            快捷添加 voice_url
          </Button>
        )}
      </div>
    </div>
  );
};

export default TTSConfigPanel;
