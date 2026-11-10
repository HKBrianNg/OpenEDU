import { createBrowserRouter } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import { Home } from './pages/Home';
import { Category } from './pages/Category';
import { SportVideo } from './pages/SportVideo';
import { HanziWriting } from './pages/HanziWriting';
import { ChineseNursery } from './pages/music/ChineseNursery';
import { ChinesePop } from './pages/music/ChinesePop';
import { EnglishNursery } from './pages/music/EnglishNursery';
import { EnglishPop } from './pages/music/EnglishPop';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'sports/video', element: <SportVideo /> },
      { path: 'chinese/writing', element: <HanziWriting /> },
      { path: 'music/cn-nursery', element: <ChineseNursery />},
      { path: 'music/cn-pop', element: <ChinesePop />},
      { path: 'music/en-nursery', element: <EnglishNursery />},
      { path: 'music/en-pop', element: <EnglishPop />},
      { path: ':routePath', element: <Category /> },
    ]
  }
]);
