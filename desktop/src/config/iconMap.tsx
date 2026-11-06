import {
  HomeOutlined,
  BookOutlined,
  SoundOutlined,
  TrophyOutlined,
  FontColorsOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import type { ReactNode } from 'react';

const iconComponentMap: Record<string, React.FC> = {
  home: HomeOutlined,
  book: BookOutlined,
  sound: SoundOutlined,
  trophy: TrophyOutlined,
  fontColors: FontColorsOutlined,
  play: PlayCircleOutlined
};

export function getIcon(name: string): ReactNode | undefined {
  const C = iconComponentMap[name];
  if (!C) return undefined;
  return <C />;
}
