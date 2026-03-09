import React from 'react';
import { Button, Input, Select, Typography, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { EndConfig, OutputParam } from '../../types';
import type { Node } from 'reactflow';

const { Text } = Typography;
const { TextArea } = Input;

// 节点类型显示名称
const NODE_TYPE_LABELS: Record<string, string> = {
  startNode: '输入',
  llmNode: '大模型',
  ttsNode: '音频合成',
};

interface EndConfigPanelProps {
  config: EndConfig;
  /** 画布上所有节点（排除当前 END 节点），用于生成引用下拉选项 */
  upstreamNodes: Node[];
  onChange: (config: EndConfig) => void;
}

/** 输出节点配置面板 */
const EndConfigPanel: React.FC<EndConfigPanelProps> = ({ config, upstreamNodes, onChange }) => {
  const params = config.outputParams || [];
  const answerContent = config.answerContent || '';

  // 构建引用下拉选项：上游节点列表
  const referenceOptions = upstreamNodes.map((node) => ({
    value: node.id,
    label: `${NODE_TYPE_LABELS[node.type || ''] || node.type}（${node.id}）`,
  }));

  // 更新某一行参数
  const updateParam = (index: number, patch: Partial<OutputParam>) => {
    const next = [...params];
    next[index] = { ...next[index], ...patch };
    // 切换类型时清空 value
    if (patch.type !== undefined && patch.type !== params[index].type) {
      next[index].value = '';
    }
    onChange({ ...config, outputParams: next });
  };

  // 添加一行
  const addParam = () => {
    onChange({
      ...config,
      outputParams: [...params, { name: '', type: 'input', value: '' }],
    });
  };

  // 删除一行
  const removeParam = (index: number) => {
    const next = params.filter((_, i) => i !== index);
    onChange({ ...config, outputParams: next });
  };

  // 更新回答内容
  const updateAnswerContent = (value: string) => {
    onChange({ ...config, answerContent: value });
  };

  // 构建可引用的参数名提示
  const paramHints = params
    .filter((p) => p.name.trim())
    .map((p) => `{{${p.name}}}`)
    .join('、');

  return (
    <div>
      {/* ===== 输出配置 ===== */}
      <Text strong style={{ fontSize: 14 }}>输出配置</Text>
      <div style={{ marginTop: 12 }}>
        {params.map((param, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 8,
              alignItems: 'flex-start',
            }}
          >
            {/* 参数名 */}
            <Input
              placeholder="参数名"
              value={param.name}
              onChange={(e) => updateParam(index, { name: e.target.value })}
              style={{ width: 100 }}
              size="small"
            />

            {/* 参数类型 */}
            <Select
              value={param.type}
              onChange={(val) => updateParam(index, { type: val })}
              style={{ width: 90 }}
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
                onChange={(e) => updateParam(index, { value: e.target.value })}
                style={{ flex: 1 }}
                size="small"
              />
            ) : (
              <Select
                placeholder="选择引用节点"
                value={param.value || undefined}
                onChange={(val) => updateParam(index, { value: val })}
                style={{ flex: 1 }}
                size="small"
                options={referenceOptions}
              />
            )}

            {/* 删除按钮 */}
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => removeParam(index)}
            />
          </div>
        ))}

        <Button
          type="dashed"
          onClick={addParam}
          icon={<PlusOutlined />}
          size="small"
          block
        >
          添加
        </Button>
      </div>

      <Divider />

      {/* ===== 回答内容 ===== */}
      <Text strong style={{ fontSize: 14 }}>回答内容</Text>
      {paramHints && (
        <div style={{ marginTop: 4, marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            可引用变量：{paramHints}
          </Text>
        </div>
      )}
      <TextArea
        rows={6}
        placeholder={'在此编写回答内容模板，使用 {{参数名}} 引用输出配置中的参数'}
        value={answerContent}
        onChange={(e) => updateAnswerContent(e.target.value)}
        style={{ marginTop: paramHints ? 0 : 8 }}
      />
    </div>
  );
};

export default EndConfigPanel;
