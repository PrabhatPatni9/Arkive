declare module '@capacitor-mlkit/text-recognition' {
  export interface TextFrame {
    x: number
    y: number
    width: number
    height: number
  }
  export interface TextBlock {
    text: string
    frame?: TextFrame
    lines?: Array<{ text: string; frame?: TextFrame }>
  }
  export interface ProcessImageResult {
    text: string
    blocks: TextBlock[]
  }
  export const TextRecognition: {
    processImage(options: { imageBase64: string }): Promise<ProcessImageResult>
  }
}
