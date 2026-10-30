// Membaca foto dari browser dan mengembalikannya sebagai data URL tanpa kompresi.
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Foto tidak bisa dibaca.'))
    reader.readAsDataURL(file)
  })
}

// // Mengecilkan foto di browser supaya muat di dokumen Firestore (batas 1 MiB).
// const encode = (canvas: HTMLCanvasElement, quality: number) => {
//   const webp = canvas.toDataURL('image/webp', quality)
//   // Safari lama tidak mendukung WebP dan mengembalikan PNG
//   return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality)
// }

// export async function compressImage(file: File, maxWidth = 300, maxChars = 100_000): Promise<string> {
//   const bmp = await createImageBitmap(file)
//   let w = Math.min(maxWidth, bmp.width)
//   for (let attempt = 0; attempt < 5; attempt++) {
//     const h = Math.round((bmp.height * w) / bmp.width)
//     const canvas = document.createElement('canvas')
//     canvas.width = w
//     canvas.height = h
//     canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
//     for (const q of [0.75, 0.6, 0.45]) {
//       const data = encode(canvas, q)
//       if (data.length <= maxChars) return data
//     }
//     w = Math.round(w * 0.8)
//   }
//   throw new Error('Foto masih terlalu besar setelah dikecilkan. Coba foto lain.')
// }
