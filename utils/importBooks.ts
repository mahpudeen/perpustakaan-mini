import type { Book, BookInput } from '~/composables/useBooks'
import type { Category } from '~/composables/useCategories'
import { SHELF_COUNT, CUBE_COUNT } from '~/composables/useBooks'
import { cleanIsbn } from '~/utils/isbn'

export interface ImportRow {
  index: number
  book: BookInput
  errors: string[]
  warnings: string[]
  status: 'valid' | 'warning' | 'error'
  importStatus?: 'pending' | 'success' | 'failed'
  importError?: string
}

export interface ParseResult {
  rows: ImportRow[]
  error: string | null
}

const isValidYMD = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, day] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, day)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === day
}

export const parseAndValidateBooks = (
  rawJson: string,
  existingBooks: Book[],
  categories: Category[],
): ParseResult => {
  const trimmed = rawJson.trim()
  if (!trimmed) {
    return { rows: [], error: null }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Format JSON tidak valid'
    return { rows: [], error: `JSON tidak valid: ${msg}` }
  }

  let items: unknown[]
  if (Array.isArray(parsed)) {
    items = parsed
  } else if (parsed && typeof parsed === 'object') {
    items = [parsed]
  } else {
    return {
      rows: [],
      error: 'JSON harus berupa array objek buku atau satu objek buku tunggal.',
    }
  }

  if (items.length === 0) {
    return { rows: [], error: 'Array JSON kosong, tidak ada buku untuk diperiksa.' }
  }

  const seenIsbns = new Map<string, number>()
  const seenCodes = new Map<string, number>()
  const seenCubeCategories = new Map<string, string>()

  const rows: ImportRow[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const rowNum = i + 1
    const errors: string[] = []
    const warnings: string[] = []

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      rows.push({
        index: rowNum,
        book: {
          title: '',
          author: '',
          isbn: '',
          code: '',
          category: '',
          synopsis: '',
          shelf: null,
          cube: null,
          purchaseDate: '',
          coverUrl: '',
          coverData: '',
          price: null,
        },
        errors: ['Baris bukan objek data buku yang valid.'],
        warnings: [],
        status: 'error',
      })
      continue
    }

    const obj = item as Record<string, unknown>

    const title = typeof obj.title === 'string' ? obj.title.trim() : (obj.title ? String(obj.title).trim() : '')
    const author = typeof obj.author === 'string' ? obj.author.trim() : (obj.author ? String(obj.author).trim() : '')
    const rawIsbn = typeof obj.isbn === 'string' ? obj.isbn.trim() : (obj.isbn ? String(obj.isbn).trim() : '')
    const cleanedIsbn = cleanIsbn(rawIsbn)
    const code = typeof obj.code === 'string' ? obj.code.trim() : (obj.code ? String(obj.code).trim() : '')
    const category = typeof obj.category === 'string' ? obj.category.trim() : (obj.category ? String(obj.category).trim() : '')
    const purchaseDate = typeof obj.purchaseDate === 'string' ? obj.purchaseDate.trim() : (obj.purchaseDate ? String(obj.purchaseDate).trim() : '')
    const synopsis = typeof obj.synopsis === 'string' ? obj.synopsis.trim() : (obj.synopsis ? String(obj.synopsis).trim() : '')
    const coverUrl = typeof obj.coverUrl === 'string' ? obj.coverUrl.trim() : (obj.coverUrl ? String(obj.coverUrl).trim() : '')

    // Parse shelf & cube
    let shelf: number | null = null
    let shelfInvalid = false
    if (obj.shelf !== undefined && obj.shelf !== null && obj.shelf !== '') {
      const n = typeof obj.shelf === 'number' ? obj.shelf : Number(obj.shelf)
      if (Number.isInteger(n)) {
        shelf = n
      } else {
        shelfInvalid = true
      }
    }

    let cube: number | null = null
    let cubeInvalid = false
    if (obj.cube !== undefined && obj.cube !== null && obj.cube !== '') {
      const n = typeof obj.cube === 'number' ? obj.cube : Number(obj.cube)
      if (Number.isInteger(n)) {
        cube = n
      } else {
        cubeInvalid = true
      }
    }

    // Parse price
    let price: number | null = null
    if (obj.price !== undefined && obj.price !== null && obj.price !== '') {
      const p = typeof obj.price === 'number' ? obj.price : Number(obj.price)
      if (Number.isInteger(p) && p >= 0) {
        price = p
      } else {
        errors.push('harga harus bilangan bulat >= 0')
      }
    }

    // ── Validasi Error (baris dilewati) ──
    // 1. title kosong
    if (!title) {
      errors.push('Judul wajib diisi.')
    }

    // 2. purchaseDate bukan format YYYY-MM-DD
    if (!purchaseDate || !isValidYMD(purchaseDate)) {
      errors.push('Tanggal beli bukan format YYYY-MM-DD.')
    }

    // 3. shelf diisi tanpa cube, atau sebaliknya
    const hasShelf = shelf !== null || shelfInvalid
    const hasCube = cube !== null || cubeInvalid
    if ((hasShelf && !hasCube) || (!hasShelf && hasCube)) {
      errors.push('Pilih rak dan kubus sekaligus, atau kosongkan keduanya.')
    }

    // 4. shelf/cube di luar jangkauan
    if (hasShelf) {
      if (shelfInvalid || shelf === null || shelf < 1 || shelf > SHELF_COUNT) {
        errors.push(`Rak di luar jangkauan (harus antara 1 sampai ${SHELF_COUNT}).`)
      }
    }
    if (hasCube) {
      if (cubeInvalid || cube === null || cube < 1 || cube > CUBE_COUNT) {
        errors.push(`Kubus di luar jangkauan (harus antara 1 sampai ${CUBE_COUNT}).`)
      }
    }

    // 5. category tidak ada di daftar kategori
    if (!category) {
      errors.push('Kategori wajib diisi.')
    } else {
      const catExists = categories.some((c) => c.name === category)
      if (!catExists) {
        errors.push(`Kategori "${category}" tidak terdaftar.`)
      }
    }

    // 6. ISBN sudah ada di koleksi, atau dobel di dalam JSON yang sama
    if (cleanedIsbn) {
      const inCollection = existingBooks.find((b) => cleanIsbn(b.isbn) === cleanedIsbn)
      if (inCollection) {
        errors.push(`ISBN "${rawIsbn}" sudah ada di koleksi (${inCollection.title}).`)
      } else if (seenIsbns.has(cleanedIsbn)) {
        errors.push(`ISBN "${rawIsbn}" dobel dengan baris ${seenIsbns.get(cleanedIsbn)} di JSON ini.`)
      } else {
        seenIsbns.set(cleanedIsbn, rowNum)
      }
    }

    // ── Validasi Warning (baris tetap diimpor) ──
    // 1. kode buku sudah dipakai buku lain atau baris lain di JSON
    if (code) {
      const codeLower = code.toLowerCase()
      const inCollectionCode = existingBooks.find(
        (b) => b.code && b.code.trim().toLowerCase() === codeLower,
      )
      if (inCollectionCode) {
        warnings.push(`Kode "${code}" sudah dipakai oleh buku "${inCollectionCode.title}".`)
      } else if (seenCodes.has(codeLower)) {
        warnings.push(`Kode "${code}" sama dengan baris ${seenCodes.get(codeLower)} di JSON ini.`)
      } else {
        seenCodes.set(codeLower, rowNum)
      }
    }

    // 2. kubus tujuan sudah berisi kategori yang berbeda
    if (shelf !== null && cube !== null && category) {
      const cubeKey = `${shelf}-${cube}`
      const existingInCube = existingBooks.find(
        (b) => b.shelf === shelf && b.cube === cube && b.category && b.category.trim(),
      )
      if (
        existingInCube &&
        existingInCube.category.trim().toLowerCase() !== category.toLowerCase()
      ) {
        warnings.push(
          `Kubus ${cube} di Rak ${shelf} sudah berisi kategori "${existingInCube.category}".`,
        )
      } else if (seenCubeCategories.has(cubeKey)) {
        const prevCategory = seenCubeCategories.get(cubeKey)!
        if (prevCategory.toLowerCase() !== category.toLowerCase()) {
          warnings.push(
            `Kubus ${cube} di Rak ${shelf} sudah diberi kategori "${prevCategory}" pada baris sebelumnya di JSON ini.`,
          )
        }
      } else {
        seenCubeCategories.set(cubeKey, category)
      }
    }

    // 3. synopsis sangat panjang (> 5000 karakter)
    if (synopsis.length > 5000) {
      warnings.push(`Sinopsis sangat panjang (${synopsis.length} karakter).`)
    }

    const status: 'valid' | 'warning' | 'error' = errors.length > 0
      ? 'error'
      : warnings.length > 0
        ? 'warning'
        : 'valid'

    rows.push({
      index: rowNum,
      book: {
        title,
        author,
        isbn: cleanedIsbn || rawIsbn,
        code,
        category,
        synopsis,
        shelf,
        cube,
        purchaseDate,
        price,
        coverUrl,
        coverData: '',
      },
      errors,
      warnings,
      status,
    })
  }

  return { rows, error: null }
}
