import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { HomeScreen } from './screens/HomeScreen'
import { FamilyScreen } from './screens/FamilyScreen'
import { VaultScreen } from './screens/VaultScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { DocumentCaptureScreen } from './screens/DocumentCaptureScreen'
import { SubscriptionScreen } from './screens/SubscriptionScreen'
import { EmergencyScreen } from './screens/EmergencyScreen'
import { EmergencyCardScreen } from './screens/EmergencyCardScreen'
import { RemindersScreen } from './screens/RemindersScreen'
import { OnboardingScreen } from './screens/onboarding/OnboardingScreen'
import { CreateFamilyScreen } from './screens/onboarding/CreateFamilyScreen'
import { RecoveryPhraseScreen } from './screens/onboarding/RecoveryPhraseScreen'
import { JoinFamilyScreen } from './screens/onboarding/JoinFamilyScreen'
import { ApproveJoinScreen } from './screens/onboarding/ApproveJoinScreen'
import { Nav } from './components/Nav'
import { getFamily } from './family/familyStore'
import { initSodium } from './crypto/sodium'
import './app.css'

function applyTheme() {
  const theme = localStorage.getItem('arkive_theme') ?? 'light'
  const accent = localStorage.getItem('arkive_accent') ?? 'blue'
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-accent', accent)
}

// Redirects to onboarding if no family is set up
function RequireFamily({ children }: { children: React.ReactNode }) {
  const family = getFamily()
  if (!family) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

// Redirects to home if family already exists
function RequireNoFamily({ children }: { children: React.ReactNode }) {
  const family = getFamily()
  if (family) return <Navigate to="/home" replace />
  return <>{children}</>
}

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    applyTheme()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'arkive_theme' || e.key === 'arkive_accent') applyTheme()
    }
    window.addEventListener('storage', onStorage)
    initSodium().then(() => setReady(true))
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (!ready) {
    return (
      <div style={{
        height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Initialising…</p>
      </div>
    )
  }

  const hasFamily = !!getFamily()

  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="screen-area">
          <Routes>
            {/* Root redirect */}
            <Route path="/" element={<Navigate to={hasFamily ? '/home' : '/onboarding'} replace />} />

            {/* Onboarding — only accessible without a family */}
            <Route path="/onboarding" element={<RequireNoFamily><OnboardingScreen /></RequireNoFamily>} />
            <Route path="/onboarding/create" element={<RequireNoFamily><CreateFamilyScreen /></RequireNoFamily>} />
            <Route path="/onboarding/recovery" element={<RequireNoFamily><RecoveryPhraseScreen /></RequireNoFamily>} />
            <Route path="/onboarding/join" element={<RequireNoFamily><JoinFamilyScreen /></RequireNoFamily>} />

            {/* Main app — require family */}
            <Route path="/home" element={<RequireFamily><HomeScreen /></RequireFamily>} />
            <Route path="/family" element={<RequireFamily><FamilyScreen /></RequireFamily>} />
            <Route path="/family/approve-join" element={<RequireFamily><ApproveJoinScreen /></RequireFamily>} />
            <Route path="/vault" element={<RequireFamily><VaultScreen /></RequireFamily>} />
            <Route path="/vault/capture" element={<RequireFamily><DocumentCaptureScreen /></RequireFamily>} />
            <Route path="/settings" element={<RequireFamily><SettingsScreen /></RequireFamily>} />
            <Route path="/settings/subscription" element={<RequireFamily><SubscriptionScreen /></RequireFamily>} />
            <Route path="/emergency" element={<RequireFamily><EmergencyScreen /></RequireFamily>} />
            <Route path="/emergency/card/:memberId" element={<RequireFamily><EmergencyCardScreen /></RequireFamily>} />
            <Route path="/reminders" element={<RequireFamily><RemindersScreen /></RequireFamily>} />
          </Routes>
        </div>
        {hasFamily && <Nav />}
      </div>
    </BrowserRouter>
  )
}
