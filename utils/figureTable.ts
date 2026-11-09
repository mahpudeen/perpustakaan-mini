import type { Figure, FigureSize } from '~/composables/useFigures'
import { naturalCompare, formatTanggal, paginate, buildPageList, numericCompare, type SortDirection } from '~/utils/bookTable'

export type FigureSortColumn = 'nama' | 'anime' | 'size' | 'tgl' | 'letak' | 'harga'

export function filterFigures(
  figures: Figure[],
  query: string,
  animeFilter: string,
  sizeFilter: string,
  priceFilter?: string,
): Figure[] {
  let result = figures

  // Filter Harga
  if (priceFilter === 'isi') {
    result = result.filter((f) => f.price !== null && f.price !== undefined)
  } else if (priceFilter === 'kosong') {
    result = result.filter((f) => f.price === null || f.price === undefined)
  }

  // Filter Anime
  if (animeFilter) {
    if (animeFilter === '__none') {
      result = result.filter((f) => !f.anime || !f.anime.trim())
    } else {
      const targetLower = animeFilter.trim().toLowerCase()
      result = result.filter(
        (f) => f.anime && f.anime.trim().toLowerCase() === targetLower,
      )
    }
  }

  // Filter Size
  if (sizeFilter) {
    const sLower = sizeFilter.trim().toLowerCase()
    result = result.filter((f) => f.size?.toLowerCase() === sLower)
  }

  // Search query (Nama & Anime)
  const q = query.trim().toLowerCase()
  if (q) {
    const words = q.split(/\s+/).filter(Boolean)
    result = result.filter((f) => {
      const haystack = `${f.name || ''} ${f.anime || ''}`.toLowerCase()
      return words.every((w) => haystack.includes(w))
    })
  }

  return result
}

const sizeWeight = (size: FigureSize | string): number => {
  switch (size?.toLowerCase()) {
    case 'besar':
      return 1
    case 'medium':
      return 2
    case 'kecil':
      return 3
    default:
      return 4
  }
}

export function sortFigures(
  figures: Figure[],
  column: FigureSortColumn = 'nama',
  direction: SortDirection = 'asc',
): Figure[] {
  return [...figures].sort((a, b) => {
    let cmp = 0

    if (column === 'nama') {
      cmp = naturalCompare(a.name, b.name, direction)
      return cmp
    }

    if (column === 'anime') {
      cmp = naturalCompare(a.anime, b.anime, direction)
      if (cmp !== 0) return cmp
    } else if (column === 'size') {
      const rankA = sizeWeight(a.size)
      const rankB = sizeWeight(b.size)
      cmp = rankA - rankB
      if (direction === 'desc') cmp = -cmp
      if (cmp !== 0) return cmp
    } else if (column === 'tgl') {
      const dateA = (a.purchaseDate || '').trim()
      const dateB = (b.purchaseDate || '').trim()
      const emptyA = !dateA
      const emptyB = !dateB
      if (emptyA && emptyB) cmp = 0
      else if (emptyA) return 1
      else if (emptyB) return -1
      else {
        cmp = dateA.localeCompare(dateB)
        if (direction === 'desc') cmp = -cmp
      }
      if (cmp !== 0) return cmp
    } else if (column === 'letak') {
      const placedA = a.shelf !== null && a.cube !== null
      const placedB = b.shelf !== null && b.cube !== null
      if (!placedA && !placedB) cmp = 0
      else if (!placedA) return 1
      else if (!placedB) return -1
      else {
        const shelfDiff = (a.shelf || 0) - (b.shelf || 0)
        if (shelfDiff !== 0) {
          cmp = direction === 'desc' ? -shelfDiff : shelfDiff
        } else {
          const cubeDiff = (a.cube || 0) - (b.cube || 0)
          cmp = direction === 'desc' ? -cubeDiff : cubeDiff
        }
      }
      if (cmp !== 0) return cmp
    } else if (column === 'harga') {
      cmp = numericCompare(a.price, b.price, direction)
      if (cmp !== 0) return cmp
    }

    // Tie-break selalu berdasarkan nama naik
    return naturalCompare(a.name, b.name, 'asc')
  })
}
