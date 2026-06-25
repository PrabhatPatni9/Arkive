import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { HomeScreen } from './screens/HomeScreen'
import { FamilyScreen } from './screens/FamilyScreen'
import { VaultScreen } from './screens/VaultScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { DocumentCaptureScreen } from './screens/DocumentCaptureScreen'
import { SubscriptionScreen } from './screens/SubscriptionScreen'
import { Nav } from './components/Nav'
import './app.css'

function applyTheme() {
  const theme = localStorage.getItem('arkive_theme') ?? 'light'
  const accent = localStorage.getItem('arkive_accent') ?? 'blue'
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-accent', accent)
}

export default function App() {
  useEffect(() => {
    applyTheme()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'arkive_theme' || e.key === 'arkive_accent') applyTheme()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="screen-area">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/family" element={<FamilyScreen />} />
            <Route path="/vault" element={<VaultScreen />} />
            <Route path="/vault/capture" element={<DocumentCaptureScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/settings/subscription" element={<SubscriptionScreen />} />
          </Routes>
        </div>
        <Nav />
      </div>
    </BrowserRouter>
  )
}
