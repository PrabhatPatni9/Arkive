import type { Env, DeviceRow, OpIndexRow } from '../types'

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
