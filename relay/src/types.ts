export interface Env {
  DB: D1Database
  OPS_BUCKET: R2Bucket
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  RELAY_ADMIN_TOKEN: string
}

export interface DeviceRow {
  device_id: string
  family_id: string
  sign_public_key: string
  push_endpoint: string | null
  push_auth: string | null
  push_p256dh: string | null
  registered_at: string
}

export interface DeviceTokenRow {
  token: string
  device_id: string
  family_id: string
  created_at: string
}

export interface OpIndexRow {
  op_hash: string
  family_id: string
  scope: string
  lamport_clock: number
  author_device_id: string
  posted_at: string
}

export interface JoinHandshakeRow {
  request_id: string
  family_id: string
  request_json: string
  approval_json: string | null
  posted_at: string
  approved_at: string | null
}

export interface PostOpBody {
  family_id?: string
  op: {
    op_id: string
    scope: string
    key_epoch: number
    prev_hash: string
    lamport_clock: number
    author_device_id: string
    signature: string
    encrypted_payload: string
    hash: string
  }
}

export interface RegisterDeviceBody {
  device_id: string
  family_id: string
  sign_public_key: string
  push_subscription?: {
    endpoint: string
    keys: { auth: string; p256dh: string }
  }
}

export interface PostJoinRequestBody {
  family_id: string
  request_id: string
  request_json: string
}

export interface PostJoinApprovalBody {
  request_id: string
  approval_json: string
}

export interface SignalRow {
  id: string
  sender_id: string
  recipient_id: string
  family_id: string
  type: 'offer' | 'answer' | 'ice' | 'presence'
  payload: string
  expires_at: number
}

export interface PostSignalBody {
  recipient_device_id: string
  type: 'offer' | 'answer' | 'ice' | 'presence'
  payload: string
}
