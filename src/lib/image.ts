// 写真を送る前に、ブラウザの中で小さくする。
// - スマホの写真は 1 枚 3〜10MB あるが、サーバーが受け取るのは 2MB まで。長い辺 1280px の JPEG にすれば数百 KB で済む
// - 描き直すので、写真に埋まっている撮影場所(GPS)などの情報も一緒に落ちる

export const MAX_SIDE = 1280
export const JPEG_QUALITY = 0.82

/** 縦横の比を保ったまま、長い辺が maxSide 以下になる大きさを返す(小さい画像は拡大しない) */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** 画像ファイルを、長い辺 maxSide 以下の JPEG にして返す。画像として読めないファイルは例外になる */
export async function downscaleImage(file: Blob, maxSide = MAX_SIDE, quality = JPEG_QUALITY): Promise<Blob> {
  // from-image: スマホで縦に撮った写真が横倒しにならないように、写真に書かれた向きを反映する
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas を使えません')
    // JPEG は透明を持てない。透明な PNG が黒くならないように、先に白で塗る
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('JPEG にできませんでした'))), 'image/jpeg', quality)
    })
  } finally {
    bitmap.close()
  }
}
