import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HomeScreen } from './screens/HomeScreen'
import { FamilyScreen } from './screens/FamilyScreen'
import { VaultScreen } from './screens/VaultScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { Nav } from './components/Nav'
import './app.css'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="screen-area">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/family" element={<FamilyScreen />} />
            <Route path="/vault" element={<VaultScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </div>
        <Nav />
      </div>
    </BrowserRouter>
  )
}
