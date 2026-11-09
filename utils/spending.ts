/**
 * Utilitas fungsi murni perhitungan pengeluaran (spending)
 * untuk buku dan action figure.
 */

export interface PricedItem {
  price?: number | null
  purchaseDate?: string | null
}

export interface SpendingYearRow {
  label: string
  buku: number
  figure: number
  total: number
  countBuku: number
  countFigure: number
}

export interface SpendingGroupRow {
  label: string
  count: number
  total: number
  share: number // persentase 0 - 100
}

/**
 * Menjumlahkan nilai price yang valid (abaikan null, undefined, NaN).
 */
export const sumPrices = (items: Array<{ price?: number | null }>): number => {
  let total = 0
  for (const item of items) {
    const p = item?.price
    if (typeof p === 'number' && Number.isFinite(p) && p >= 0) {
      total += p
    }
  }
  return total
}

/**
 * Menghitung jumlah item yang memiliki harga valid.
 */
export const countPriced = (items: Array<{ price?: number | null }>): number => {
  let count = 0
  for (const item of items) {
    const p = item?.price
    if (typeof p === 'number' && Number.isFinite(p) && p >= 0) {
      count++
    }
  }
  return count
}

/**
 * Mengambil 4 digit tahun dari string purchaseDate (contoh: "2024-03-01" -> "2024").
 * Mengembalikan null jika tanggal kosong atau tidak memiliki 4 digit tahun valid.
 */
export const yearOf = (purchaseDate: string | null | undefined): string | null => {
  if (!purchaseDate) return null
  const trimmed = purchaseDate.trim()
  const match = trimmed.match(/^(\d{4})/)
  if (!match) return null
  const y = Number(match[1])
  if (y < 1900 || y > 2100) return null
  return match[1]
}

/**
 * Pengelompokan pengeluaran per tahun beli.
 * Hanya item berharga (price !== null) yang dihitung.
 * Urutan kronologis naik, "Tanpa tanggal beli" paling akhir.
 */
export const groupByYear = (
  books: Array<{ price?: number | null; purchaseDate?: string | null }>,
  figures: Array<{ price?: number | null; purchaseDate?: string | null }>,
): SpendingYearRow[] => {
  const map = new Map<string, { buku: number; figure: number; countBuku: number; countFigure: number }>()

  const ensureEntry = (key: string) => {
    let entry = map.get(key)
    if (!entry) {
      entry = { buku: 0, figure: 0, countBuku: 0, countFigure: 0 }
      map.set(key, entry)
    }
    return entry
  }

  // Akumulasi buku
  for (const b of books) {
    const p = b.price
    if (typeof p !== 'number' || !Number.isFinite(p) || p < 0) continue
    const y = yearOf(b.purchaseDate) || '__none'
    const entry = ensureEntry(y)
    entry.buku += p
    entry.countBuku++
  }

  // Akumulasi figures
  for (const f of figures) {
    const p = f.price
    if (typeof p !== 'number' || !Number.isFinite(f.price) || p < 0) continue
    const y = yearOf(f.purchaseDate) || '__none'
    const entry = ensureEntry(y)
    entry.figure += p
    entry.countFigure++
  }

  // Pisahkan tahun angka dan '__none'
  const yearKeys = Array.from(map.keys()).filter((k) => k !== '__none')
  yearKeys.sort((a, b) => a.localeCompare(b))

  const rows: SpendingYearRow[] = []

  for (const y of yearKeys) {
    const entry = map.get(y)!
    rows.push({
      label: y,
      buku: entry.buku,
      figure: entry.figure,
      total: entry.buku + entry.figure,
      countBuku: entry.countBuku,
      countFigure: entry.countFigure,
    })
  }

  if (map.has('__none')) {
    const entry = map.get('__none')!
    rows.push({
      label: 'Tanpa tanggal beli',
      buku: entry.buku,
      figure: entry.figure,
      total: entry.buku + entry.figure,
      countBuku: entry.countBuku,
      countFigure: entry.countFigure,
    })
  }

  return rows
}

/**
 * Pengelompokan pengeluaran buku per kategori.
 * Hanya buku berharga (price !== null) yang dihitung.
 * Urut dari total terbesar.
 */
export const groupByCategory = <T extends { price?: number | null }>(
  books: T[],
  nameOf: (b: T) => string,
): SpendingGroupRow[] => {
  const map = new Map<string, { count: number; total: number }>()
  let grandTotal = 0

  for (const b of books) {
    const p = b.price
    if (typeof p !== 'number' || !Number.isFinite(p) || p < 0) continue
    const rawName = (nameOf(b) || '').trim()
    const label = rawName || 'Tanpa kategori'

    const cur = map.get(label) || { count: 0, total: 0 }
    cur.count++
    cur.total += p
    map.set(label, cur)
    grandTotal += p
  }

  const rows: SpendingGroupRow[] = Array.from(map.entries()).map(([label, val]) => ({
    label,
    count: val.count,
    total: val.total,
    share: grandTotal > 0 ? Number(((val.total / grandTotal) * 100).toFixed(1)) : 0,
  }))

  rows.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'id'))
  return rows
}

/**
 * Pengelompokan pengeluaran figure per seri anime (case-insensitive).
 * Hanya figure berharga (price !== null) yang dihitung.
 * Urut dari total terbesar.
 */
export const groupByAnime = <T extends { price?: number | null; anime?: string | null }>(
  figures: T[],
): SpendingGroupRow[] => {
  const map = new Map<string, { label: string; count: number; total: number }>()
  let grandTotal = 0

  for (const f of figures) {
    const p = f.price
    if (typeof p !== 'number' || !Number.isFinite(p) || p < 0) continue
    const rawAnime = (f.anime || '').trim()
    const normKey = rawAnime ? rawAnime.toLowerCase() : '__none'

    let cur = map.get(normKey)
    if (!cur) {
      cur = {
        label: rawAnime || 'Tanpa anime',
        count: 0,
        total: 0,
      }
      map.set(normKey, cur)
    } else {
      // Pertahankan label dengan huruf kapital bila sebelumnya lowercase
      if (rawAnime && rawAnime !== rawAnime.toLowerCase() && cur.label === cur.label.toLowerCase()) {
        cur.label = rawAnime
      }
    }

    cur.count++
    cur.total += p
    grandTotal += p
  }

  const rows: SpendingGroupRow[] = Array.from(map.values()).map((val) => ({
    label: val.label,
    count: val.count,
    total: val.total,
    share: grandTotal > 0 ? Number(((val.total / grandTotal) * 100).toFixed(1)) : 0,
  }))

  rows.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'id'))
  return rows
}
