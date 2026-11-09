import { createBrowserRouter } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import { Home } from './pages/Home';
import { Category } from './pages/Category';
import { SportVideo } from './pages/SportVideo';
import { HanziWriting } from './pages/HanziWriting';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'sports/video', element: <SportVideo /> },
      { path: 'chinese/writing', element: <HanziWriting /> },
      { path: ':routePath', element: <Category /> },
    ]
  }
]);
