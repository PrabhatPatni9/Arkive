import type { SyncTierId } from './plans'
import { SYNC_TIERS } from './plans'

export interface LoadOrderResponse {
  orderId: string
  amount: number   // paise
  currency: string
}

export interface CheckoutResult {
  paymentId: string
  orderId: string
  signature: string
}

export async function createRelayOrder(
  relayUrl: string,
  familyId: string
): Promise<LoadOrderResponse> {
  const res = await fetch(`${relayUrl}/payments/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ syncTierId: 'managed_relay', familyId }),
  })
  if (!res.ok) throw new Error(`Order creation failed: ${res.status}`)
  return res.json() as Promise<LoadOrderResponse>
}

export function openRazorpayCheckout(
  razorpayKey: string,
  order: LoadOrderResponse,
  tierId: SyncTierId,
  familyName: string
): Promise<CheckoutResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.Razorpay) {
      reject(new Error('Razorpay SDK not loaded'))
      return
    }
    const tier = SYNC_TIERS[tierId]
    const rzp = new window.Razorpay({
      key: razorpayKey,
      amount: order.amount,
      currency: order.currency,
      name: 'Arkive',
      description: `${tier.name} — ${familyName}`,
      order_id: order.orderId,
      handler(response) {
        resolve({
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
        })
      },
      theme: { color: '#4f8ef7' },
      modal: {
        ondismiss() {
          reject(new Error('Payment dismissed by user'))
        },
      },
    })
    rzp.open()
  })
}
