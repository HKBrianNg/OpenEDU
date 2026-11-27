// desktop/src/router/routeRegistry.tsx
//
// 路由 → 页面组件映射。Tab 化后所有页面由 TabShell 按 route 渲染（保活/卸载
// 由 Tab 生命周期管理），router.tsx 只保留 AppShell + '*' 通配。
// 未在静态映射里的路径落到 Category 卡片墙（保持原 :routePath 兜底行为）。

import type { ReactNode } from 'react';
import { Home } from '../pages/home';
import { Category } from '../pages/home/Category';
import { SportVideo } from '../pages/sports/SportVideo';
import { HanziWriting } from '../pages/chinese/HanziWriting';
import { ChineseNursery } from '../pages/music/ChineseNursery';
import { ChinesePop } from '../pages/music/ChinesePop';
import { EnglishNursery } from '../pages/music/EnglishNursery';
import { EnglishPop } from '../pages/music/EnglishPop';
import { CheckerGame } from '../pages/games/checkers';
import { JungleGame } from '../pages/games/jungle';
import { TicTacToeGame } from '../pages/games/tictactoe';
import { TileMatchingGame } from '../pages/games/tilematching';
import { XiangqiGame } from '../pages/games/xiangqi';
import { KnowledgeBase } from '../pages/science/KnowledgeBase';
import { JuniorEncyclopedia } from '../pages/science/JuniorEncyclopedia';
import { BasicEnglish300 } from '../pages/english/BasicEnglish300';
import { EnglishWord } from '../pages/english/EnglishWord';
import { EnglishVideo } from '../pages/english/EnglishVideo';
import { EnglishShorts } from '../pages/english/EnglishShorts';
import { MyCalendar } from '../pages/dashboard/mycalendar';
import { LearningResults } from '../pages/dashboard/learningresults';
import { Register } from '../pages/home/Register';
import { DBTest } from '../pages/admin/DBtest';
import { LogViewer } from '../pages/admin/LogViewer';
import { UserAdmin } from '../pages/admin/UserAdmin';
import { SongsAdmin } from '../pages/admin/SongsAdmin';
import { VideoAdmin } from '../pages/admin/VideoAdmin';
import { ImageAdmin } from '../pages/admin/ImageAdmin';
import { DataAdmin } from '../pages/admin/DataAdmin';
import { VoiceAdmin } from '../pages/admin/VoiceAdmin';
import { PhoneAdmin } from '../pages/admin/PhoneAdmin';

// 原路由表的静态映射（path 保持原样，含前导斜杠）
const registry: Record<string, ReactNode> = {
  '/': <Home />,
  '/register': <Register />,
  '/dashboard/my-calendar': <MyCalendar />,
  '/dashboard/learning-results': <LearningResults />,
  '/sports/video': <SportVideo />,
  '/chinese/writing': <HanziWriting />,
  '/music/cn-nursery': <ChineseNursery />,
  '/music/cn-pop': <ChinesePop />,
  '/music/en-nursery': <EnglishNursery />,
  '/music/en-pop': <EnglishPop />,
  '/games/checkers': <CheckerGame />,
  '/games/jungle': <JungleGame />,
  '/games/tictactoe': <TicTacToeGame />,
  '/games/tilematching': <TileMatchingGame />,
  '/games/xiangqi': <XiangqiGame />,
  '/science/knowledge': <KnowledgeBase />,
  '/science/encyclopedia': <JuniorEncyclopedia />,
  '/english/basic300': <BasicEnglish300 />,
  '/english/englishword': <EnglishWord />,
  '/english/video': <EnglishVideo />,
  '/english/englishshorts': <EnglishShorts />,
  '/admin/dbtest': <DBTest />,
  '/admin/logs': <LogViewer />,
  '/admin/users': <UserAdmin />,
  '/admin/songs': <SongsAdmin />,
  '/admin/videos': <VideoAdmin />,
  '/admin/images': <ImageAdmin />,
  '/admin/data': <DataAdmin />,
  '/admin/voice': <VoiceAdmin />,
  '/admin/phone': <PhoneAdmin />,
};

/**
 * 解析 route 对应的页面。静态映射命中直接返回；
 * 其余按原 Category 兜底（/admin、/music 这类模块首页 → 子功能卡片墙）。
 */
export function resolveRouteElement(route: string): ReactNode {
  if (registry[route]) return registry[route];
  const routePath = route.replace(/^\//, '').replace(/\/+$/, '');
  return <Category routePath={routePath} />;
}
