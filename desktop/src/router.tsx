// desktop/src/router.tsx

import { createBrowserRouter } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import { Home } from './pages/home';
import { Category } from './pages/home/Category';
import { SportVideo } from './pages/sports/SportVideo';
import { HanziWriting } from './pages/chinese/HanziWriting';
import { ChineseNursery } from './pages/music/ChineseNursery';
import { ChinesePop } from './pages/music/ChinesePop';
import { EnglishNursery } from './pages/music/EnglishNursery';
import { EnglishPop } from './pages/music/EnglishPop';
import { CheckerGame } from './pages/games/checkers';
import { JungleGame } from './pages/games/jungle';
import { TicTacToeGame } from './pages/games/tictactoe';
import { TileMatchingGame } from './pages/games/tilematching';
import { XiangqiGame } from './pages/games/xiangqi';
import { KnowledgeBase } from './pages/science/KnowledgeBase';
import { JuniorEncyclopedia } from './pages/science/JuniorEncyclopedia';
import { BasicEnglish300 } from './pages/english/BasicEnglish300';
import { EnglishWord } from './pages/english/EnglishWord';
import { EnglishVideo } from './pages/english/EnglishVideo';
import { EnglishShorts } from './pages/english/EnglishShorts';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'sports/video', element: <SportVideo /> },
      { path: 'chinese/writing', element: <HanziWriting /> },
      { path: 'music/cn-nursery', element: <ChineseNursery /> },
      { path: 'music/cn-pop', element: <ChinesePop /> },
      { path: 'music/en-nursery', element: <EnglishNursery /> },
      { path: 'music/en-pop', element: <EnglishPop /> },
      // 👇 games 路由（onExit 传入兜底返回）
      { path: 'games/checkers', element: <CheckerGame /> },
      { path: 'games/jungle', element: <JungleGame /> },
      { path: 'games/tictactoe', element: <TicTacToeGame /> },
      { path: 'games/tilematching', element: <TileMatchingGame /> },
      { path: 'games/xiangqi', element: <XiangqiGame /> },
      { path: 'science/knowledge', element: <KnowledgeBase /> },
      { path: 'science/encyclopedia', element: <JuniorEncyclopedia /> },
      { path: 'english/basic300', element: <BasicEnglish300 /> },
      { path: 'english/englishword', element: <EnglishWord /> },
      { path: 'english/video', element: <EnglishVideo /> },
      { path: 'english/englishshorts', element: <EnglishShorts /> },
      { path: ':routePath', element: <Category /> },
    ]
  }
]);