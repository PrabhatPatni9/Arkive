import type { Env, DeviceRow, DeviceTokenRow, OpIndexRow, JoinHandshakeRow } from '../types'

export async function getDevice(env: Env, deviceId: string): Promise<DeviceRow | null> {
  return env.DB.prepare('SELECT * FROM devices WHERE device_id = ?')
    .bind(deviceId)
    .first<DeviceRow>()
}

export async function upsertDevice(env: Env, row: DeviceRow): Promise<void> {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO devices
       (device_id,family_id,sign_public_key,push_endpoint,push_auth,push_p256dh,registered_at)
     VALUES (?,?,?,?,?,?,?)`
  )
    .bind(
      row.device_id, row.family_id, row.sign_public_key,
      row.push_endpoint, row.push_auth, row.push_p256dh, row.registered_at
    )
    .run()
}

export async function createDeviceToken(env: Env, row: DeviceTokenRow): Promise<void> {
  await env.DB.prepare(
    'INSERT OR REPLACE INTO device_tokens (token,device_id,family_id,created_at) VALUES (?,?,?,?)'
  )
    .bind(row.token, row.device_id, row.family_id, row.created_at)
    .run()
}

export async function getDeviceByToken(
  env: Env,
  token: string
): Promise<{ deviceId: string; familyId: string } | null> {
  const row = await env.DB.prepare(
    'SELECT device_id, family_id FROM device_tokens WHERE token = ?'
  )
    .bind(token)
    .first<{ device_id: string; family_id: string }>()
  if (!row) return null
  return { deviceId: row.device_id, familyId: row.family_id }
}

export async function indexOp(env: Env, row: OpIndexRow): Promise<void> {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO op_index
       (op_hash,family_id,scope,lamport_clock,author_device_id,posted_at)
     VALUES (?,?,?,?,?,?)`
  )
    .bind(
      row.op_hash, row.family_id, row.scope,
      row.lamport_clock, row.author_device_id, row.posted_at
    )
    .run()
}

export async function getOpsSince(
  env: Env,
  familyId: string,
  sinceLamport: number,
  limit = 200
): Promise<OpIndexRow[]> {
  const res = await env.DB.prepare(
    `SELECT * FROM op_index WHERE family_id=? AND lamport_clock>=?
     ORDER BY lamport_clock ASC LIMIT ?`
  )
    .bind(familyId, sinceLamport, limit)
    .all<OpIndexRow>()
  return res.results
}

export async function getFamilyDevices(env: Env, familyId: string): Promise<DeviceRow[]> {
  const res = await env.DB.prepare(
    'SELECT * FROM devices WHERE family_id=?'
  )
    .bind(familyId)
    .all<DeviceRow>()
  return res.results
}

export async function upsertJoinHandshake(env: Env, row: JoinHandshakeRow): Promise<void> {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO join_handshakes
       (request_id,family_id,request_json,approval_json,posted_at,approved_at)
     VALUES (?,?,?,?,?,?)`
  )
    .bind(
      row.request_id, row.family_id, row.request_json,
      row.approval_json, row.posted_at, row.approved_at
    )
    .run()
}

export async function getJoinHandshake(
  env: Env,
  requestId: string
): Promise<JoinHandshakeRow | null> {
  return env.DB.prepare('SELECT * FROM join_handshakes WHERE request_id = ?')
    .bind(requestId)
    .first<JoinHandshakeRow>()
}

export async function setJoinApproval(
  env: Env,
  requestId: string,
  approvalJson: string
): Promise<void> {
  await env.DB.prepare(
    'UPDATE join_handshakes SET approval_json=?, approved_at=? WHERE request_id=?'
  )
    .bind(approvalJson, new Date().toISOString(), requestId)
    .run()
}

export async function getPendingJoinRequests(
  env: Env,
  familyId: string
): Promise<JoinHandshakeRow[]> {
  const res = await env.DB.prepare(
    `SELECT * FROM join_handshakes
     WHERE family_id=? AND approval_json IS NULL
     ORDER BY posted_at ASC LIMIT 50`
  )
    .bind(familyId)
    .all<JoinHandshakeRow>()
  return res.results
}
