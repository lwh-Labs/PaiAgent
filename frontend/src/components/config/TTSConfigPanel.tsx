import React, { useEffect } from 'react';
import { Form, Input, Slider, Typography } from 'antd';
import type { TTSConfig } from '../../types';

const { Text } = Typography;

interface TTSConfigPanelProps {
  config: TTSConfig;
  /** 配置变更回调，实时同步到节点 data */
  onChange: (config: TTSConfig) => void;
}

/** TTS 节点配置面板（CosyVoice 超拟人音频合成） */
const TTSConfigPanel: React.FC<TTSConfigPanelProps> = ({ config, onChange }) => {
  const [form] = Form.useForm<TTSConfig>();

  // 当外部 config 变化时，同步到表单
  useEffect(() => {
    form.setFieldsValue(config);
  }, [config, form]);

  // 表单字段变化时，回调最新值
  const handleValuesChange = (_: Partial<TTSConfig>, allValues: TTSConfig) => {
    onChange(allValues);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        speed: 1.0,
        pitch: 1.0,
        ...config,
      }}
      onValuesChange={handleValuesChange}
      size="small"
    >
      {/* CosyVoice API 密钥 */}
      <Form.Item label="API Key" name="apiKey" rules={[{ required: true, message: '请输入 CosyVoice API Key' }]}>
        <Input.Password placeholder="输入阿里云 DashScope API Key" autoComplete="off" />
      </Form.Item>

      {/* 音色 ID */}
      <Form.Item
        label="音色 ID（Voice ID）"
        name="voiceId"
        rules={[{ required: true, message: '请输入音色 ID' }]}
        extra={<Text type="secondary">例如：longxiaochun、longxiaoxia、longwan</Text>}
      >
        <Input placeholder="longxiaochun" />
      </Form.Item>

      {/* 语速 */}
      <Form.Item
        label={<>语速（Speed）<Text type="secondary"> (0.5~2.0，默认 1.0)</Text></>}
        name="speed"
      >
        <Slider min={0.5} max={2.0} step={0.1} marks={{ 0.5: '0.5', 1.0: '1.0', 2.0: '2.0' }} />
      </Form.Item>

      {/* 音调 */}
      <Form.Item
        label={<>音调（Pitch）<Text type="secondary"> (0.5~2.0，默认 1.0)</Text></>}
        name="pitch"
      >
        <Slider min={0.5} max={2.0} step={0.1} marks={{ 0.5: '0.5', 1.0: '1.0', 2.0: '2.0' }} />
      </Form.Item>
    </Form>
  );
};

export default TTSConfigPanel;
