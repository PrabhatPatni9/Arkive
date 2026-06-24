import type { PlanId } from './plans'
import { PLANS } from './plans'

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

export async function createOrder(
  relayUrl: string,
  planId: PlanId,
  familyId: string
): Promise<LoadOrderResponse> {
  const res = await fetch(`${relayUrl}/payments/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, familyId }),
  })
  if (!res.ok) throw new Error(`Order creation failed: ${res.status}`)
  return res.json() as Promise<LoadOrderResponse>
}

export function openRazorpayCheckout(
  razorpayKey: string,
  order: LoadOrderResponse,
  planId: PlanId,
  familyName: string
): Promise<CheckoutResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.Razorpay) {
      reject(new Error('Razorpay SDK not loaded'))
      return
    }
    const plan = PLANS[planId]
    const rzp = new window.Razorpay({
      key: razorpayKey,
      amount: order.amount,
      currency: order.currency,
      name: 'Arkive',
      description: `${plan.name} plan — ${familyName}`,
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
