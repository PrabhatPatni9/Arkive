import _sodium from 'libsodium-wrappers'

let _initialized = false

export async function initSodium(): Promise<void> {
  if (_initialized) return
  await _sodium.ready
  _initialized = true
}

export { _sodium as sodium }
