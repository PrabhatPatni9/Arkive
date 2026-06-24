import { describe, it, expect } from 'vitest'
import { checkForUpdate, downloadAndVerify, type UpdateManifest } from './index'

const dummyManifest: UpdateManifest = {
  version: '0.0.2',
  buildNumber: 2,
  apkUrl: 'https://relay.example.com/blob/arkive-0.0.2.apk',
  sha256: 'aaaa',
  ed25519Signature: 'bbbb',
  signedAt: new Date().toISOString(),
}

describe('updater skeleton', () => {
  it('checkForUpdate throws until Phase 1 implementation lands', async () => {
    await expect(checkForUpdate(1)).rejects.toThrow('not implemented')
  })

  it('downloadAndVerify throws when VITE_UPDATE_PUBKEY is not set', async () => {
    // In the test environment VITE_UPDATE_PUBKEY is empty, so the guard fires.
    await expect(downloadAndVerify(dummyManifest)).rejects.toThrow(
      'VITE_UPDATE_PUBKEY is not configured',
    )
  })
})
