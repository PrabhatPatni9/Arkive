import type { OcrResult } from './types'

export interface OcrService {
  isAvailable(): Promise<boolean>
  recognize(imageBase64: string): Promise<OcrResult>
}

export class StubOcrService implements OcrService {
  async isAvailable(): Promise<boolean> {
    return false
  }
  async recognize(_imageBase64: string): Promise<OcrResult> {
    return { text: '', blocks: [] }
  }
}

// Native ML Kit — best quality, fully offline. Only present in the Capacitor Android build.
async function createMlKitService(): Promise<OcrService | null> {
  try {
    const { TextRecognition } = await import('@capacitor-mlkit/text-recognition')
    return {
      async isAvailable() { return true },
      async recognize(imageBase64: string): Promise<OcrResult> {
        const result = await TextRecognition.processImage({ imageBase64 })
        return {
          text: result.text,
          blocks: result.blocks.map(b => ({
            text: b.text,
            frame: b.frame ?? { x: 0, y: 0, width: 0, height: 0 },
          })),
        }
      },
    }
  } catch {
    return null   // not the native build
  }
}

// Web/PWA fallback — Tesseract.js (WASM), lazy-loaded so it never bloats the main bundle. Needs
// network the first time to fetch the recognition model; OCR is a confirm-the-fields convenience,
// not an offline-critical path, so this is an acceptable web-only limitation.
async function createTesseractService(): Promise<OcrService | null> {
  try {
    const Tesseract = await import('tesseract.js')
    return {
      async isAvailable() { return true },
      async recognize(imageBase64: string): Promise<OcrResult> {
        const src = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
        const { data } = await Tesseract.recognize(src, 'eng')
        const words = (data.words ?? []) as Array<{ text: string; bbox?: { x0: number; y0: number; x1: number; y1: number } }>
        return {
          text: data.text ?? '',
          blocks: words.map(w => ({
            text: w.text,
            frame: w.bbox
              ? { x: w.bbox.x0, y: w.bbox.y0, width: w.bbox.x1 - w.bbox.x0, height: w.bbox.y1 - w.bbox.y0 }
              : { x: 0, y: 0, width: 0, height: 0 },
          })),
        }
      },
    }
  } catch {
    return null   // tesseract unavailable (e.g. offline first run)
  }
}

/**
 * Pick the best available OCR engine: native ML Kit on Android, else Tesseract.js on the web,
 * else a no-op stub. Chosen once at call time and cached by the caller.
 */
export async function createOcrService(): Promise<OcrService> {
  return (await createMlKitService())
    ?? (await createTesseractService())
    ?? new StubOcrService()
}
