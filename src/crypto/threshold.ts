import { split as shamirSplit, combine as shamirCombine } from 'shamirs-secret-sharing'

export function computeThreshold(personCount: number): number {
  if (personCount <= 0) throw new RangeError('personCount must be >= 1')
  return Math.min(6, Math.max(2, Math.ceil(0.3 * personCount)))
}

export interface SplitResult {
  shares: Uint8Array[]
  threshold: number
}

export function splitKey(keyBytes: Uint8Array, personCount: number): SplitResult {
  const threshold = computeThreshold(personCount)
  const buf = Buffer.from(keyBytes)
  const rawShares = shamirSplit(buf, { shares: personCount, threshold })
  return {
    shares: rawShares.map(s => new Uint8Array(s)),
    threshold,
  }
}

export function reconstructKey(shares: Uint8Array[]): Uint8Array {
  const bufs = shares.map(s => Buffer.from(s))
  const result = shamirCombine(bufs)
  return new Uint8Array(result)
}
