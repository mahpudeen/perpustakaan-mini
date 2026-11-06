import type { Figure, FigureSize } from '~/composables/useFigures'

export const slotOf = (size: FigureSize | string): number => {
  switch (size?.toLowerCase()) {
    case 'besar':
      return 4
    case 'medium':
      return 2
    case 'kecil':
      return 1
    default:
      return 2
  }
}

export const sizeLabel = (size: FigureSize | string): string => {
  switch (size?.toLowerCase()) {
    case 'besar':
      return 'Besar'
    case 'medium':
      return 'Medium'
    case 'kecil':
      return 'Kecil'
    default:
      return 'Medium'
  }
}

export const cubeLoad = (
  figures: Figure[],
  shelf: number | null,
  cube: number | null,
  excludeId?: string,
): number => {
  if (shelf === null || cube === null) return 0
  let total = 0
  for (const f of figures) {
    if (f.id === excludeId) continue
    if (f.shelf === shelf && f.cube === cube) {
      total += slotOf(f.size)
    }
  }
  return total
}

const sizeRank = (size: FigureSize | string): number => {
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

export const layoutCube = (figuresInCube: Figure[]): { shown: Figure[]; hidden: Figure[] } => {
  const sorted = [...figuresInCube].sort((a, b) => {
    const rankA = sizeRank(a.size)
    const rankB = sizeRank(b.size)
    if (rankA !== rankB) return rankA - rankB
    return a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' })
  })

  const shown: Figure[] = []
  const hidden: Figure[] = []
  let totalUnits = 0

  for (const fig of sorted) {
    const cost = slotOf(fig.size)
    if (totalUnits + cost <= 4) {
      shown.push(fig)
      totalUnits += cost
    } else {
      hidden.push(fig)
    }
  }

  return { shown, hidden }
}

export const uniqueAnime = (figures: Figure[]): string[] => {
  const seenLower = new Set<string>()
  const list: string[] = []

  for (const f of figures) {
    const raw = (f.anime || '').trim()
    if (!raw) continue
    const lower = raw.toLowerCase()
    if (!seenLower.has(lower)) {
      seenLower.add(lower)
      list.push(raw)
    }
  }

  return list.sort((a, b) => a.localeCompare(b, 'id'))
}

export const canonicalAnime = (value: string | undefined | null, existing: string[]): string => {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  const trimmedLower = trimmed.toLowerCase()
  const found = existing.find((e) => e.trim().toLowerCase() === trimmedLower)
  return found ? found.trim() : trimmed
}
