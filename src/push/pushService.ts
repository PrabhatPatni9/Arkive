/**
 * Push notification service — handles both Web Push (PWA) and FCM (native Android).
 *
 * For native Android: uses @capacitor/push-notifications to get the FCM token.
 * For PWA/web: uses the browser Push API with VAPID.
 *
 * In both cases the subscription is sent to the relay at device registration
 * so the relay can send a content-free wake signal when new ops arrive.
 *
 * The VAPID public key is served by the relay at GET /vapid-public-key, or
 * set as VITE_VAPID_PUBLIC_KEY at build time.
 */

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''

const NATIVE_AVAILABLE = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).Capacitor

export async function initPush(): Promise<PushSubscriptionJSON | null> {
  if (NATIVE_AVAILABLE) {
    return initNativePush()
  }
  if ('serviceWorker' in navigator && 'PushManager' in window && VAPID_PUBLIC_KEY) {
    return initWebPush()
  }
  return null
}

async function initNativePush(): Promise<PushSubscriptionJSON | null> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const permResult = await PushNotifications.requestPermissions()
    if (permResult.receive !== 'granted') return null

    await PushNotifications.register()

    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token) => {
        resolve({ endpoint: `fcm:${token.value}`, keys: {} } as unknown as PushSubscriptionJSON)
      })
      PushNotifications.addListener('registrationError', () => resolve(null))
      setTimeout(() => resolve(null), 8000)
    })
  } catch {
    return null
  }
}

async function initWebPush(): Promise<PushSubscriptionJSON | null> {
  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) return existing.toJSON()

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    return sub.toJSON()
  } catch {
    return null
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr
}
