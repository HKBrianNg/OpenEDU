// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AppShell from './layouts/AppShell'
import Home from './pages/Home'
import Sports from './pages/Sports'
import Chinese from './pages/Chinese'
import English from './pages/English'
import Science from './pages/Science'
import Music from './pages/Music'
import Games from './pages/Games'
import Books from './pages/Books'
import Login from './pages/Login'
import Settings from './pages/Settings'

function App() {
  return (
    <Router>
      <Routes>
        {/* 需要顶部导航，套 AppShell */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/sports" element={<Sports />} />
          <Route path="/chinese" element={<Chinese />} />
          <Route path="/english" element={<English />} />
          <Route path="/science" element={<Science />} />
          <Route path="/music" element={<Music />} />
          <Route path="/games" element={<Games />} />
          <Route path="/books" element={<Books />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* 独立页面，不带 AppShell（无顶栏） */}
        <Route path="/login" element={<Login />} />
        <Route path="/403" element={<div style={{ padding: 40 }}>403 Forbidden</div>} />
        <Route path="*" element={<div style={{ padding: 40 }}>404 Not Found</div>} />
      </Routes>
    </Router>
  )
}

export default App
