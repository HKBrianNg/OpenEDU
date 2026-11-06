import { createBrowserRouter } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import { Home } from './pages/Home';
import { Category } from './pages/Category';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: ':routePath', element: <Category /> }
    ]
  }
]);
