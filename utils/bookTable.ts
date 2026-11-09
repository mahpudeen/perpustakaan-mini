import type { Book } from '~/composables/useBooks'

export type SortColumn = 'kode' | 'judul' | 'pengarang' | 'kategori' | 'tgl' | 'harga'
export type SortDirection = 'asc' | 'desc'
export type ViewMode = 'tabel' | 'kartu'
export type PriceFilter = '' | 'isi' | 'kosong'

/**
 * Perbandingan numerik untuk pengurutan harga.
 * Nilai kosong (null/undefined/NaN) selalu diletakkan di paling bawah, baik saat asc maupun desc.
 */
export function numericCompare(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: SortDirection = 'asc',
): number {
  const emptyA = a === null || a === undefined || !Number.isFinite(a)
  const emptyB = b === null || b === undefined || !Number.isFinite(b)

  if (emptyA && emptyB) return 0
  if (emptyA) return 1
  if (emptyB) return -1

  const diff = (a as number) - (b as number)
  return direction === 'desc' ? -diff : diff
}

/**
 * Natural sort perbandingan string sesuai kaidah bahasa Indonesia.
 * Mendukung numeric natural sort: AGM-01, AGM-2, AGM-10, BIO-1.
 * Nilai kosong selalu diletakkan di paling bawah, baik saat asc maupun desc.
 */
export function naturalCompare(
  a: string | null | undefined,
  b: string | null | undefined,
  direction: SortDirection = 'asc',
): number {
  const strA = (a ?? '').trim()
  const strB = (b ?? '').trim()

  const emptyA = !strA
  const emptyB = !strB

  if (emptyA && emptyB) return 0
  if (emptyA) return 1
  if (emptyB) return -1

  const cmp = strA.localeCompare(strB, 'id', { numeric: true, sensitivity: 'base' })
  return direction === 'desc' ? -cmp : cmp
}

/**
 * Format tanggal YYYY-MM-DD menjadi format id-ID (contoh: 5 Nov 2026).
 * Memecah string manual agar tidak bergeser zona waktu.
 */
export function formatTanggal(dateStr: string | null | undefined): string {
  if (!dateStr || !dateStr.trim()) return '-'
  const parts = dateStr.trim().split('-')
  if (parts.length !== 3) return '-'
  const [y, m, d] = parts.map(Number)
  if (!y || !m || !d) return '-'
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Filter buku berdasarkan kata kunci pencarian dan filter kategori.
 * Pencarian hanya mencakup Kode, Judul, Pengarang (bukan ISBN atau kategori).
 * Semua kata harus ditemukan di gabungan kode + judul + pengarang.
 */
export function filterBooks(
  books: Book[],
  query: string,
  categoryFilter: string,
  getCategoryName: (book: Book) => string = (b) => b.category || '',
  isCategoryMatch?: (book: Book, filter: string) => boolean,
  priceFilter?: string,
): Book[] {
  let result = books

  if (priceFilter === 'isi') {
    result = result.filter((b) => b.price !== null && b.price !== undefined)
  } else if (priceFilter === 'kosong') {
    result = result.filter((b) => b.price === null || b.price === undefined)
  }

  if (categoryFilter) {
    if (isCategoryMatch) {
      result = result.filter((b) => isCategoryMatch(b, categoryFilter))
    } else if (categoryFilter === '__none') {
      result = result.filter((b) => {
        const catName = getCategoryName(b).trim()
        const catId = (b as unknown as { categoryId?: string }).categoryId
        return !catName && !catId
      })
    } else {
      result = result.filter((b) => {
        const catName = getCategoryName(b).trim()
        const catId = (b as unknown as { categoryId?: string }).categoryId
        return (
          b.category === categoryFilter ||
          b.category?.toLowerCase() === categoryFilter.toLowerCase() ||
          catId === categoryFilter ||
          catName.toLowerCase() === categoryFilter.toLowerCase()
        )
      })
    }
  }

  const q = (query || '').trim().toLowerCase()
  if (!q) return result

  const words = q.split(/\s+/).filter(Boolean)
  return result.filter((b) => {
    const text = `${b.code || ''} ${b.title || ''} ${b.author || ''}`.toLowerCase()
    return words.every((w) => text.includes(w))
  })
}

/**
 * Mengurutkan buku berdasarkan kolom yang dipilih.
 * Nilai kosong selalu di paling bawah.
 * Tie-breaker bila nilai sama: Kode (natural, naik), lalu Judul (natural, naik).
 */
export function sortBooks(
  books: Book[],
  column: SortColumn = 'kode',
  direction: SortDirection = 'asc',
  getCategoryName: (book: Book) => string = (b) => b.category || '',
): Book[] {
  return [...books].sort((a, b) => {
    if (column === 'harga') {
      const primary = numericCompare(a.price, b.price, direction)
      if (primary !== 0) return primary
    } else {
      let valA = ''
      let valB = ''

      if (column === 'kode') {
        valA = a.code || ''
        valB = b.code || ''
      } else if (column === 'judul') {
        valA = a.title || ''
        valB = b.title || ''
      } else if (column === 'pengarang') {
        valA = a.author || ''
        valB = b.author || ''
      } else if (column === 'kategori') {
        valA = getCategoryName(a) || ''
        valB = getCategoryName(b) || ''
      } else if (column === 'tgl') {
        valA = a.purchaseDate || ''
        valB = b.purchaseDate || ''
      }

      const primary = naturalCompare(valA, valB, direction)
      if (primary !== 0) return primary
    }

    // Tie-breaker: Kode (natural, naik), lalu Judul (natural, naik)
    const tieCode = naturalCompare(a.code || '', b.code || '', 'asc')
    if (tieCode !== 0) return tieCode

    return naturalCompare(a.title || '', b.title || '', 'asc')
  })
}

export interface PaginationResult<T> {
  items: T[]
  totalItems: number
  totalPages: number
  currentPage: number
  startIndex: number
  endIndex: number
}

/**
 * Memotong data untuk pagination. Menjepit currentPage ke batas yang valid [1, totalPages].
 */
export function paginate<T>(items: T[], page: number, perPage: number): PaginationResult<T> {
  const totalItems = items.length
  const safePerPage = perPage > 0 ? perPage : 10
  const totalPages = Math.max(1, Math.ceil(totalItems / safePerPage))
  const currentPage = Math.max(1, Math.min(page, totalPages))
  const startIndex = (currentPage - 1) * safePerPage
  const endIndex = Math.min(startIndex + safePerPage, totalItems)
  const sliced = items.slice(startIndex, endIndex)

  return {
    items: sliced,
    totalItems,
    totalPages,
    currentPage,
    startIndex,
    endIndex,
  }
}

/**
 * Membangun daftar nomor halaman untuk navigasi:
 * Selalu menampilkan halaman pertama, terakhir, aktif, dan satu di kiri-kanan aktif;
 * sisanya digantikan dengan '…'.
 */
export function buildPageList(currentPage: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 0) return []
  if (totalPages === 1) return [1]

  const safeCurrent = Math.max(1, Math.min(currentPage, totalPages))
  const pageSet = new Set<number>([
    1,
    totalPages,
    Math.max(1, safeCurrent - 1),
    safeCurrent,
    Math.min(totalPages, safeCurrent + 1),
  ])

  const sorted = Array.from(pageSet).sort((a, b) => a - b)
  const result: (number | '…')[] = []

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      if (curr - prev === 2) {
        result.push(prev + 1)
      } else if (curr - prev > 2) {
        result.push('…')
      }
    }
    result.push(sorted[i])
  }

  return result
}
