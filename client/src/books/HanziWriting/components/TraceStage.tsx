import { useState } from 'react';
import { Button, Space, Tag, Typography } from 'antd';
import { useHanziWriter } from '../hooks/useHanziWriter';
import PracticeGrid from './PracticeGrid';
import type { HanziChar, ScriptMode } from '../types';
import { charOf, strokesOf } from '../constants';
import { useLocale } from '../../../store/LocaleContext';

const { Text } = Typography;

interface TraceStageProps {
  entry: HanziChar;
  script: ScriptMode;
  size: number;
}

/**
 * 描红：灰色轮廓打底，娃自己一笔一笔往上写。
 * 用的就是 HanziWriter 的 quiz —— 写错方向或位置会提示，错了两次直接把这一笔亮出来。
 * 重开一轮只要再调一次 quiz()，库内部会先清掉之前画的笔迹。
 */
export default function TraceStage({ entry, script, size }: TraceStageProps) {
  const { t } = useLocale();
  const char = charOf(entry, script);
  const total = strokesOf(entry, script);

  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [drawn, setDrawn] = useState(0);
  const [mistakes, setMistakes] = useState(0);

  const { containerRef, writerRef } = useHanziWriter({
    char,
    grade: entry.grade,
    script,
    size,
    showOutline: true,
    showCharacter: false,
    strokeAnimationSpeed: 1,
  });

  const startQuiz = () => {
    const writer = writerRef.current;
    if (!writer) return;
    setDone(false);
    setMistakes(0);
    setDrawn(0);
    setRunning(true);
    void writer.quiz({
      // 娃刚开始拿鼠标画线歪歪扭扭，判宽一点，别一上来就打击信心
      leniency: 1.4,
      showHintAfterMisses: 2,
      acceptBackwardsStrokes: true,
      onCorrectStroke: (stroke) => setDrawn(stroke.strokeNum + 1),
      onMistake: (stroke) => setMistakes(stroke.totalMistakes),
      onComplete: () => {
        setRunning(false);
        setDone(true);
        setDrawn(total);
      },
    });
  };

  return (
    <div>
      <PracticeGrid size={size}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      </PracticeGrid>

      <div
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Space wrap>
          <Button type="primary" onClick={startQuiz} disabled={running}>
            {t('hanziwriting.startTrace')}
          </Button>
          <Button onClick={() => writerRef.current?.skipQuizStroke()} disabled={!running}>
            {t('hanziwriting.skipStroke')}
          </Button>
          <Button onClick={startQuiz}>{t('hanziwriting.restart')}</Button>
        </Space>

        <Text type="secondary">
          {t('hanziwriting.drawn')} <b>{drawn} / {total}</b>
        </Text>
        {mistakes > 0 && (
          <Tag color="orange">
            {t('hanziwriting.mistakes')} {mistakes}
          </Tag>
        )}
        {done && <Tag color="green">{t('hanziwriting.finished')}</Tag>}
      </div>
    </div>
  );
}
