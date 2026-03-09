import React, { useState, useRef } from 'react';
import {
  Drawer,
  Button,
  Input,
  Typography,
  Tag,
  Collapse,
  Spin,
  Alert,
  Empty,
  Divider,
} from 'antd';
import {
  PlayCircleOutlined,
  RobotOutlined,
  SoundOutlined,
  FlagOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { executeWorkflow } from '../api';
import type { NodeResult, ExecuteResponse } from '../types';

const { TextArea } = Input;
const { Title, Text } = Typography;

// 各节点类型图标映射
const NODE_TYPE_ICONS: Record<string, React.ReactNode> = {
  START: <PlayCircleOutlined style={{ color: '#52c41a' }} />,
  LLM: <RobotOutlined style={{ color: '#1677ff' }} />,
  TTS: <SoundOutlined style={{ color: '#722ed1' }} />,
  END: <FlagOutlined style={{ color: '#fa8c16' }} />,
};

// 节点类型中文名称
const NODE_TYPE_LABELS: Record<string, string> = {
  START: '用户输入',
  LLM: '大模型',
  TTS: '音频合成',
  END: '结束',
};

// 渲染执行状态标签
const StatusTag: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'SUCCESS') return <Tag color="success" icon={<CheckCircleOutlined />}>成功</Tag>;
  if (status === 'FAILED') return <Tag color="error" icon={<CloseCircleOutlined />}>失败</Tag>;
  if (status === 'RUNNING') return <Tag color="processing" icon={<LoadingOutlined />}>运行中</Tag>;
  if (status === 'SKIPPED') return <Tag color="default">已跳过</Tag>;
  return <Tag color="default">等待中</Tag>;
};

// 计算执行耗时
const calcDuration = (startTime?: string, endTime?: string): string => {
  if (!startTime || !endTime) return '-';
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

// 单个节点结果卡片
const NodeResultCard: React.FC<{ result: NodeResult; index: number }> = ({ result, index }) => {
  const icon = NODE_TYPE_ICONS[result.nodeType] || <RobotOutlined />;
  const label = NODE_TYPE_LABELS[result.nodeType] || result.nodeType;
  const duration = calcDuration(result.startTime, result.endTime);

  const collapseItems = [
    {
      key: 'output',
      label: '输出数据',
      children: (
        <pre className="json-output">
          {JSON.stringify(result.output, null, 2)}
        </pre>
      ),
    },
  ];

  return (
    <div className="node-result-card">
      {/* 节点标题行 */}
      <div className="node-result-header">
        <span className="node-result-index">{index + 1}</span>
        <span className="node-result-icon">{icon}</span>
        <span className="node-result-label">{label}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{duration}</Text>
          <StatusTag status={result.status} />
        </span>
      </div>

      {/* 失败时展示错误信息 */}
      {result.status === 'FAILED' && result.errorMessage && (
        <Alert
          message={result.errorMessage}
          type="error"
          showIcon
          style={{ marginTop: 8, fontSize: 12 }}
        />
      )}

      {/* 输出数据折叠面板 */}
      {result.output && Object.keys(result.output).length > 0 && (
        <Collapse
          size="small"
          ghost
          items={collapseItems}
          style={{ marginTop: 4 }}
        />
      )}
    </div>
  );
};

interface DebugDrawerProps {
  open: boolean;
  onClose: () => void;
  workflowId: number | null;
  /** 执行完成后回调节点结果，用于更新画板节点状态 */
  onExecuteComplete: (results: NodeResult[]) => void;
  /** 执行开始前回调，用于重置节点状态 */
  onExecuteStart: () => void;
}

/** 调试抽屉 — 输入文字、执行工作流、查看逐节点结果、音频播放 */
const DebugDrawer: React.FC<DebugDrawerProps> = ({
  open,
  onClose,
  workflowId,
  onExecuteComplete,
  onExecuteStart,
}) => {
  const [inputText, setInputText] = useState('');
  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<ExecuteResponse | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 提取音频 URL（finalOutput 或最后一个 TTS 节点的 output）
  const audioUrl = (() => {
    if (!executeResult) return null;
    const finalAudio = executeResult.finalOutput?.audioUrl as string | undefined;
    if (finalAudio) return `http://localhost:8080${finalAudio}`;
    // 从 nodeResults 中找最后一个 TTS 节点的 audioUrl
    const ttsResult = [...(executeResult.nodeResults || [])]
      .reverse()
      .find((r) => r.nodeType === 'TTS');
    const ttsAudio = ttsResult?.output?.audioUrl as string | undefined;
    if (ttsAudio) return `http://localhost:8080${ttsAudio}`;
    return null;
  })();

  // 执行工作流
  const handleExecute = async () => {
    if (!inputText.trim()) {
      return;
    }
    if (!workflowId) {
      setExecuteError('工作流未保存，请先保存工作流');
      return;
    }

    setExecuting(true);
    setExecuteResult(null);
    setExecuteError(null);
    onExecuteStart();

    try {
      const result = await executeWorkflow(workflowId, { input: { text: inputText } });
      setExecuteResult(result);
      onExecuteComplete(result.nodeResults || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '执行失败，请检查工作流配置和后端服务';
      setExecuteError(msg);
      console.error('执行工作流失败:', err);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Drawer
      title={<Title level={5} style={{ margin: 0 }}>调试面板</Title>}
      placement="right"
      width={480}
      open={open}
      onClose={onClose}
      footer={null}
    >
      {/* 文字输入区 */}
      <div className="debug-section">
        <Text strong style={{ display: 'block', marginBottom: 8 }}>输入文字</Text>
        <TextArea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="请输入要处理的文字内容，例如：请介绍一下人工智能的发展历程"
          rows={4}
          disabled={executing}
        />
      </div>

      {/* 执行按钮 */}
      <div className="debug-section">
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleExecute}
          loading={executing}
          disabled={!inputText.trim()}
          block
          size="large"
        >
          {executing ? '执行中...' : '运行工作流'}
        </Button>
      </div>

      {/* 执行中状态 */}
      {executing && (
        <div className="debug-loading">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          <Text type="secondary" style={{ marginLeft: 12 }}>
            正在执行工作流，LLM/TTS 处理可能需要较长时间，请耐心等待...
          </Text>
        </div>
      )}

      {/* 错误提示 */}
      {executeError && !executing && (
        <div className="debug-section">
          <Alert message={executeError} type="error" showIcon />
        </div>
      )}

      {/* 执行结果 */}
      {executeResult && !executing && (
        <>
          <Divider>
            <Text strong style={{ fontSize: 13 }}>
              执行结果
              <span style={{ marginLeft: 8 }}>
                {executeResult.status === 'SUCCESS'
                  ? <Tag color="success">成功</Tag>
                  : <Tag color="error">失败</Tag>
                }
              </span>
            </Text>
          </Divider>

          {/* 逐节点结果列表 */}
          {executeResult.nodeResults?.length > 0 ? (
            <div className="node-results-list">
              {executeResult.nodeResults.map((result, index) => (
                <NodeResultCard key={result.nodeId} result={result} index={index} />
              ))}
            </div>
          ) : (
            <Empty description="暂无节点执行结果" />
          )}

          {/* 音频播放器 */}
          {audioUrl && (
            <>
              <Divider>
                <Text strong style={{ fontSize: 13 }}>
                  <SoundOutlined style={{ marginRight: 6, color: '#722ed1' }} />
                  音频播放
                </Text>
              </Divider>
              <div className="audio-player-wrapper">
                <audio
                  ref={audioRef}
                  controls
                  src={audioUrl}
                  style={{ width: '100%' }}
                  onError={() => {
                    console.error('音频加载失败:', audioUrl);
                  }}
                >
                  您的浏览器不支持 audio 标签
                </audio>
              </div>
            </>
          )}
        </>
      )}

      {/* 初始状态提示 */}
      {!executeResult && !executing && !executeError && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#bbb' }}>
          <PlayCircleOutlined style={{ fontSize: 48, marginBottom: 12 }} />
          <div>输入文字后点击"运行工作流"开始调试</div>
        </div>
      )}
    </Drawer>
  );
};

export default DebugDrawer;
