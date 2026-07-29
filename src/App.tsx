import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { HomeScreen } from './screens/HomeScreen'
import { FamilyScreen } from './screens/FamilyScreen'
import { VaultScreen } from './screens/VaultScreen'
import { VaultDocumentScreen } from './screens/VaultDocumentScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { DocumentCaptureScreen } from './screens/DocumentCaptureScreen'
import { SubscriptionScreen } from './screens/SubscriptionScreen'
import { EmergencyScreen } from './screens/EmergencyScreen'
import { EmergencyCardScreen } from './screens/EmergencyCardScreen'
import { RemindersScreen } from './screens/RemindersScreen'
import { AddDependentScreen } from './screens/AddDependentScreen'
import { DataPrivacyScreen } from './screens/DataPrivacyScreen'
import { MedicalScreen } from './screens/MedicalScreen'
import { AddMedicineScreen } from './screens/AddMedicineScreen'
import { AddVitalScreen } from './screens/AddVitalScreen'
import { AddDoctorScreen } from './screens/AddDoctorScreen'
import { CalendarScreen } from './screens/CalendarScreen'
import { InsuranceScreen } from './screens/InsuranceScreen'
import { VehiclesScreen } from './screens/VehiclesScreen'
import { ExpensesScreen } from './screens/ExpensesScreen'
import { MilkScreen } from './screens/MilkScreen'
import { ContactsScreen } from './screens/ContactsScreen'
import { HomeDevicesScreen } from './screens/HomeDevicesScreen'
import { IdentityScreen } from './screens/IdentityScreen'
import { EntitiesScreen } from './screens/EntitiesScreen'
import { AssetsScreen } from './screens/AssetsScreen'
import { OnboardingScreen } from './screens/onboarding/OnboardingScreen'
import { CreateFamilyScreen } from './screens/onboarding/CreateFamilyScreen'
import { RecoveryPhraseScreen } from './screens/onboarding/RecoveryPhraseScreen'
import { JoinFamilyScreen } from './screens/onboarding/JoinFamilyScreen'
import { ApproveJoinScreen } from './screens/onboarding/ApproveJoinScreen'
import { Nav } from './components/Nav'
import { EmergencyFab } from './components/EmergencyFab'
import { getFamily, hydrateFamilyStore, applyMemberProfileFromSync, applyKeyRotationFromSync, MEMBERS_STORE, KEYS_STORE, familyKeyBytesForEpoch } from './family/familyStore'
import { registerStoreHandler } from './sync/syncContext'
import { isLockEnabled } from './security/appLock'
import { LockScreen } from './screens/LockScreen'
import { sodium } from './crypto/sodium'
import { initSodium } from './crypto/sodium'
import { LocalStorageOpLog } from './db/localStorageOpLog'
import { SyncEngine } from './sync/engine'
import { initSyncContext, clearSyncContext } from './sync/syncContext'
import { registerMedicalConflictPolicy } from './medical/conflicts'
import { refreshEntitlementFromRelay } from './payments/entitlement'
import { initPush } from './push/pushService'
import './app.css'

const RELAY_URL = (import.meta.env.VITE_RELAY_URL as string | undefined) ?? ''

function applyTheme() {
  const theme = localStorage.getItem('arkive_theme') ?? 'light'
  const accent = localStorage.getItem('arkive_accent') ?? 'blue'
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-accent', accent)
}

function RequireFamily({ children }: { children: React.ReactNode }) {
  const family = getFamily()
  if (!family) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function RequireNoFamily({ children }: { children: React.ReactNode }) {
  const family = getFamily()
  if (family) return <Navigate to="/home" replace />
  return <>{children}</>
}

export default function App() {
  const [ready, setReady] = useState(false)
  // Start locked whenever the lock is enabled, so a fresh launch requires the PIN.
  const [locked, setLocked] = useState(() => isLockEnabled())
  const engineRef = useRef<SyncEngine | null>(null)

  // Auto-lock: re-lock whenever the app is backgrounded (tab hidden / app to background).
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && isLockEnabled()) setLocked(true)
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  // Medical fields must reconcile, not silently overwrite, on sync (HC §3). Register once at boot
  // so conflicts are caught during background sync even before the Medical screen is opened.
  useEffect(() => { registerMedicalConflictPolicy() }, [])

  // Member profile/health edits + admin member-removal, and forward-only family-key rotation,
  // materialise through custom store handlers.
  useEffect(() => {
    registerStoreHandler(MEMBERS_STORE, applyMemberProfileFromSync)
    registerStoreHandler(KEYS_STORE, applyKeyRotationFromSync)
  }, [])

  useEffect(() => {
    applyTheme()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'arkive_theme' || e.key === 'arkive_accent') applyTheme()
    }
    window.addEventListener('storage', onStorage)
    // Register service worker for Web Push wake signals
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js')
    }
    // Hydrate the encrypted family store (and migrate any legacy plaintext) alongside sodium,
    // before rendering — every screen reads getFamily() synchronously once ready is set.
    Promise.all([initSodium(), hydrateFamilyStore()]).then(() => {
      setReady(true)
      const family = getFamily()
      if (RELAY_URL && family?.relayDeviceToken) {
        void refreshEntitlementFromRelay(RELAY_URL, family.relayDeviceToken)
        // Best-effort: register push subscription so relay can send wake signals
        void initPush().catch(() => null)
      }
    })
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Start SyncEngine once sodium is ready and a family + relay token exist
  useEffect(() => {
    if (!ready || !RELAY_URL) return

    const family = getFamily()
    if (!family?.relayDeviceToken) return

    const signingKeys = new Map<string, Uint8Array>()
    for (const m of family.members) {
      if (m.sigPublicKey && m.deviceId) {
        signingKeys.set(m.deviceId, sodium.from_base64(m.sigPublicKey))
      }
    }

    const opLog = new LocalStorageOpLog()
    const engine = new SyncEngine(
      {
        relayUrl: RELAY_URL,
        familyId: family.familyId,
        deviceId: family.deviceId,
        deviceToken: family.relayDeviceToken,
        signingKeys,
        intervalMs: 30_000,
      },
      opLog
    )
    // Connect the record stores to the op log: local edits emit ops (pushed by the engine),
    // and pulled ops materialise back into the stores.
    initSyncContext({
      opLog,
      scopeKeyBytes: sodium.from_base64(family.familyKey.bytes),
      keyEpoch: family.familyKey.epoch,
      keyForEpoch: familyKeyBytesForEpoch,
      signingSecretKey: sodium.from_base64(family.deviceSigKeypair.secretKey),
      deviceId: family.deviceId,
      onOp: (op) => engine.enqueuePush(op),
    })
    engine.start()
    engineRef.current = engine
    return () => { engine.stop(); clearSyncContext() }
  }, [ready])

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

  // App lock (HC §10): if enabled and currently locked, gate the whole app behind the PIN.
  if (locked && isLockEnabled()) {
    return <LockScreen onUnlock={() => setLocked(false)} />
  }

  const hasFamily = !!getFamily()

  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="screen-area">
          <Routes>
            <Route path="/" element={<Navigate to={hasFamily ? '/home' : '/onboarding'} replace />} />

            <Route path="/onboarding" element={<RequireNoFamily><OnboardingScreen /></RequireNoFamily>} />
            <Route path="/onboarding/create" element={<RequireNoFamily><CreateFamilyScreen /></RequireNoFamily>} />
            <Route path="/onboarding/recovery" element={<RequireNoFamily><RecoveryPhraseScreen /></RequireNoFamily>} />
            <Route path="/onboarding/join" element={<RequireNoFamily><JoinFamilyScreen /></RequireNoFamily>} />

            <Route path="/home" element={<RequireFamily><HomeScreen /></RequireFamily>} />
            <Route path="/family" element={<RequireFamily><FamilyScreen /></RequireFamily>} />
            <Route path="/family/approve-join" element={<RequireFamily><ApproveJoinScreen /></RequireFamily>} />
            <Route path="/family/add-dependent" element={<RequireFamily><AddDependentScreen /></RequireFamily>} />
            <Route path="/vault" element={<RequireFamily><VaultScreen /></RequireFamily>} />
            <Route path="/vault/capture" element={<RequireFamily><DocumentCaptureScreen /></RequireFamily>} />
            <Route path="/vault/doc/:docId" element={<RequireFamily><VaultDocumentScreen /></RequireFamily>} />
            <Route path="/medical" element={<RequireFamily><MedicalScreen /></RequireFamily>} />
            <Route path="/medical/add-medicine" element={<RequireFamily><AddMedicineScreen /></RequireFamily>} />
            <Route path="/medical/add-vital" element={<RequireFamily><AddVitalScreen /></RequireFamily>} />
            <Route path="/medical/add-doctor" element={<RequireFamily><AddDoctorScreen /></RequireFamily>} />
            <Route path="/calendar" element={<RequireFamily><CalendarScreen /></RequireFamily>} />
            <Route path="/settings" element={<RequireFamily><SettingsScreen /></RequireFamily>} />
            <Route path="/settings/subscription" element={<RequireFamily><SubscriptionScreen /></RequireFamily>} />
            <Route path="/settings/data" element={<RequireFamily><DataPrivacyScreen /></RequireFamily>} />
            <Route path="/emergency" element={<RequireFamily><EmergencyScreen /></RequireFamily>} />
            <Route path="/emergency/card/:memberId" element={<RequireFamily><EmergencyCardScreen /></RequireFamily>} />
            <Route path="/reminders" element={<RequireFamily><RemindersScreen /></RequireFamily>} />

            {/* Feature-flagged module routes */}
            <Route path="/insurance" element={<RequireFamily><InsuranceScreen /></RequireFamily>} />
            <Route path="/vehicles" element={<RequireFamily><VehiclesScreen /></RequireFamily>} />
            <Route path="/expenses" element={<RequireFamily><ExpensesScreen /></RequireFamily>} />
            <Route path="/milk" element={<RequireFamily><MilkScreen /></RequireFamily>} />
            <Route path="/contacts" element={<RequireFamily><ContactsScreen /></RequireFamily>} />
            <Route path="/home-devices" element={<RequireFamily><HomeDevicesScreen /></RequireFamily>} />
            <Route path="/identity" element={<RequireFamily><IdentityScreen /></RequireFamily>} />
            <Route path="/entities" element={<RequireFamily><EntitiesScreen /></RequireFamily>} />
            <Route path="/assets" element={<RequireFamily><AssetsScreen /></RequireFamily>} />
          </Routes>
        </div>
        {hasFamily && <EmergencyFab />}
        {hasFamily && <Nav />}
      </div>
    </BrowserRouter>
  )
}
