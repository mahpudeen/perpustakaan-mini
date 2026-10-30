export interface IsbnInfo {
  title: string
  author: string
  coverUrl: string
}

export const cleanIsbn = (s: string) => s.replace(/[^0-9Xx]/g, '').toUpperCase()

// ─── Helper: fetch dengan timeout ───────────────────────────────────────────
async function fetchTimeout(url: string, ms = 6000): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ─── 1. Google Books ─────────────────────────────────────────────────────────
// Cakupan luas, buku Indonesia modern banyak di sini (Gramedia, Mizan, dsb.)
async function fromGoogleBooks(isbn: string): Promise<IsbnInfo | null> {
  const r = await fetchTimeout(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`)
  if (!r.ok) return null
  const j = await r.json()
  const v = j.items?.[0]?.volumeInfo
  if (!v?.title) return null
  // Minta gambar resolusi lebih tinggi (zoom=2)
  const rawCover = v.imageLinks?.extraLarge ?? v.imageLinks?.large ?? v.imageLinks?.medium ?? v.imageLinks?.thumbnail ?? ''
  return {
    title: [v.title, v.subtitle].filter(Boolean).join(': '),
    author: (v.authors ?? []).join(', '),
    coverUrl: rawCover.replace('http://', 'https://').replace('&zoom=1', '&zoom=2'),
  }
}

// ─── 2. Open Library — books API (metadata + cover) ──────────────────────────
// Koleksi global termasuk banyak buku klasik Indonesia
async function fromOpenLibraryBooksApi(isbn: string): Promise<IsbnInfo | null> {
  const r = await fetchTimeout(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
  )
  if (!r.ok) return null
  const v = (await r.json())[`ISBN:${isbn}`]
  if (!v?.title) return null
  return {
    title: v.title,
    author: (v.authors ?? []).map((a: { name: string }) => a.name).join(', '),
    coverUrl: v.cover?.large ?? v.cover?.medium ?? '',
  }
}

// ─── 3. Open Library — search API (fallback, cover lewat cover ID) ────────────
// Lebih banyak indeks buku Indonesia (termasuk Andrea Hirata, dll.)
async function fromOpenLibrarySearch(isbn: string): Promise<IsbnInfo | null> {
  const r = await fetchTimeout(
    `https://openlibrary.org/search.json?isbn=${isbn}&fields=title,author_name,cover_i&limit=1`,
  )
  if (!r.ok) return null
  const doc = (await r.json()).docs?.[0]
  if (!doc?.title) return null
  const coverId = doc.cover_i
  return {
    title: doc.title,
    author: (doc.author_name ?? []).join(', '),
    // cover_i → Open Library Covers API (ukuran L = besar)
    coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : '',
  }
}

// ─── 4. Open Library — ISBN endpoint JSON ─────────────────────────────────────
// Endpoint langsung /isbn/{isbn}.json → redirect ke edisi
async function fromOpenLibraryIsbnJson(isbn: string): Promise<IsbnInfo | null> {
  // Ambil edisi dulu
  const r = await fetchTimeout(`https://openlibrary.org/isbn/${isbn}.json`)
  if (!r.ok) return null
  const ed = await r.json()
  if (!ed?.title) return null

  // Ambil cover dari covers array kalau ada
  const coverId = ed.covers?.[0]
  let coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : ''

  // Ambil nama penulis dari /works
  let author = ''
  try {
    const workKey = ed.works?.[0]?.key
    if (workKey) {
      const wr = await fetchTimeout(`https://openlibrary.org${workKey}.json`)
      if (wr.ok) {
        const work = await wr.json()
        // authors di works berupa array { author: { key } }
        const authorKeys: string[] = (work.authors ?? []).map((a: any) => a.author?.key).filter(Boolean)
        const names = await Promise.all(
          authorKeys.slice(0, 3).map(async (key: string) => {
            const ar = await fetchTimeout(`https://openlibrary.org${key}.json`)
            if (!ar.ok) return ''
            const a = await ar.json()
            return a.name ?? a.personal_name ?? ''
          }),
        )
        author = names.filter(Boolean).join(', ')
        // cover dari works jika edisi tidak punya
        if (!coverUrl) {
          const wCoverId = work.covers?.[0]
          if (wCoverId) coverUrl = `https://covers.openlibrary.org/b/id/${wCoverId}-L.jpg`
        }
      }
    }
  } catch {
    /* tetap lanjut tanpa author */
  }

  return { title: ed.title, author, coverUrl }
}

// ─── 5. CrossRef ─────────────────────────────────────────────────────────────
// Baik untuk buku akademik / jurnal. Tidak ada cover.
async function fromCrossRef(isbn: string): Promise<IsbnInfo | null> {
  const r = await fetchTimeout(
    `https://api.crossref.org/works?filter=isbn:${isbn}&rows=1&select=title,author,publisher`,
  )
  if (!r.ok) return null
  const item = (await r.json()).message?.items?.[0]
  if (!item?.title?.[0]) return null
  const author = (item.author ?? [])
    .slice(0, 3)
    .map((a: { given?: string; family?: string; name?: string }) =>
      a.name ?? [a.given, a.family].filter(Boolean).join(' '),
    )
    .join(', ')
  return { title: item.title[0], author, coverUrl: '' }
}

// ─── 6. Open Library Covers — ISBN langsung (hanya cover) ────────────────────
// Dipakai untuk melengkapi cover dari sumber yang tidak menyertakannya
async function openLibraryCoverByIsbn(isbn: string): Promise<string> {
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`
  try {
    const r = await fetchTimeout(url)
    // Kalau 404 → tidak ada; kalau 200 berarti cover ada
    return r.ok ? url.replace('?default=false', '') : ''
  } catch {
    return ''
  }
}

// ─── 7. Google Books — tanpa filter bahasa (fallback lebar) ──────────────────
// Kalau ISBN tidak ditemukan pertama, coba tanpa langRestrict
async function fromGoogleBooksWide(isbn: string): Promise<IsbnInfo | null> {
  const r = await fetchTimeout(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1&fields=items(volumeInfo(title,subtitle,authors,imageLinks))`,
  )
  if (!r.ok) return null
  const j = await r.json()
  const v = j.items?.[0]?.volumeInfo
  if (!v?.title) return null
  const rawCover = v.imageLinks?.large ?? v.imageLinks?.medium ?? v.imageLinks?.thumbnail ?? ''
  return {
    title: [v.title, v.subtitle].filter(Boolean).join(': '),
    author: (v.authors ?? []).join(', '),
    coverUrl: rawCover.replace('http://', 'https://'),
  }
}

// ─── Fungsi utama ─────────────────────────────────────────────────────────────
/**
 * Mencari informasi buku dari berbagai sumber secara berurutan.
 * Urutan: Google Books → OL Books API → OL Search → OL ISBN JSON → CrossRef → OL Wide
 * Cover tambahan: Open Library Covers (by ISBN) sebagai fallback sampul.
 */
export async function lookupIsbn(raw: string): Promise<IsbnInfo | null> {
  const isbn = cleanIsbn(raw)
  if (!isbn) return null

  const sources = [
    () => fromGoogleBooks(isbn),
    () => fromOpenLibraryBooksApi(isbn),
    () => fromOpenLibrarySearch(isbn),
    () => fromOpenLibraryIsbnJson(isbn),
    () => fromCrossRef(isbn),
    () => fromGoogleBooksWide(isbn),
  ]

  for (const source of sources) {
    try {
      const result = await source()
      if (result) {
        // Kalau hasilnya tidak ada cover, coba cari di OL Covers by ISBN
        if (!result.coverUrl) {
          result.coverUrl = await openLibraryCoverByIsbn(isbn).catch(() => '')
        }
        return result
      }
    } catch {
      /* sumber ini gagal, coba berikutnya */
    }
  }

  return null
}
