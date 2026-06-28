const TARGET_BYTES = 300 * 1024  // 300 KB

export async function compressImage(file: File): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap

  // Scale down if needed so the encoded output stays near the target
  const canvas = document.createElement('canvas')
  let scale = 1
  // Rough heuristic: raw RGBA bytes vs target; JPEG at q=0.85 ≈ 10:1 ratio
  const estimatedBytes = width * height * 4 / 10
  if (estimatedBytes > TARGET_BYTES) {
    scale = Math.sqrt(TARGET_BYTES / estimatedBytes)
  }

  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  // Try at quality 0.85; drop to 0.7 if still too large
  for (const quality of [0.85, 0.70, 0.55]) {
    const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
    if (blob.size <= TARGET_BYTES * 1.2) {
      const bytes = new Uint8Array(await blob.arrayBuffer())
      return { bytes, mimeType: 'image/jpeg' }
    }
  }

  // Last resort: use whatever we get at lowest quality
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.40)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return { bytes, mimeType: 'image/jpeg' }
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')),
      mimeType,
      quality
    )
  })
}

export async function prepareFile(file: File): Promise<{ bytes: Uint8Array; mimeType: string }> {
  if (file.type === 'application/pdf') {
    const bytes = new Uint8Array(await file.arrayBuffer())
    return { bytes, mimeType: 'application/pdf' }
  }
  if (file.type.startsWith('image/')) {
    return compressImage(file)
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  return { bytes, mimeType: file.type || 'application/octet-stream' }
}
