// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import SportsPage from './pages/SportsPage'
import ChinesePage from './pages/ChinesePage'
import EnglishPage from './pages/EnglishPage'
import SciencePage from './pages/SciencePage'
import MusicPage from './pages/MusicPage'
import GamesPage from './pages/GamesPage'
import BooksPage from './pages/BooksPage'
import LoginPage from './pages/LoginPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <Router>
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ flex: 1, overflow: 'auto', backgroundColor: '#f5f5f5' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/sports" element={<SportsPage />} />
            <Route path="/chinese" element={<ChinesePage />} />
            <Route path="/english" element={<EnglishPage />} />
            <Route path="/science" element={<SciencePage />} />
            <Route path="/music" element={<MusicPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
