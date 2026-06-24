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

// Dynamically imports ML Kit so web builds don't fail without the native plugin.
export async function createOcrService(): Promise<OcrService> {
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
    return new StubOcrService()
  }
}
