interface RazorpayOptions {
  key: string
  amount: number // paise (INR smallest unit)
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: RazorpayPaymentResponse) => void
  prefill?: { name?: string; email?: string; contact?: string }
  theme?: { color?: string }
  modal?: { ondismiss?: () => void }
}

interface RazorpayPaymentResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

declare class Razorpay {
  constructor(options: RazorpayOptions)
  open(): void
  on(event: string, handler: (data: unknown) => void): void
}

interface Window {
  Razorpay: typeof Razorpay
}
