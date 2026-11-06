import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'

export type FigureSize = 'besar' | 'medium' | 'kecil'

export interface Figure {
  id: string
  name: string
  anime: string
  size: FigureSize
  purchaseDate: string // YYYY-MM-DD atau ''
  photoData: string // data:image/...;base64,...
  shelf: number | null // 1 sampai 2
  cube: number | null // 1 sampai 15
}

export type FigureInput = Omit<Figure, 'id'>

export const useFigures = () => {
  const { $db } = useNuxtApp()
  const figures = useState<Figure[]>('figures', () => [])
  const loaded = useState<boolean>('figures-loaded', () => false)
  const error = useState<string | null>('figures-error', () => null)
  const subscribed = useState<boolean>('figures-subscribed', () => false)

  if (!subscribed.value) {
    subscribed.value = true
    onSnapshot(
      collection($db, 'figures'),
      (snap) => {
        figures.value = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Figure, 'id'>) }))
          .sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }))
        loaded.value = true
        error.value = null
      },
      (err) => {
        error.value = err.message
        loaded.value = true
      },
    )
  }

  const addFigure = async (input: FigureInput) => {
    const ref = await addDoc(collection($db, 'figures'), {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return ref.id
  }

  const updateFigure = (id: string, input: FigureInput) =>
    updateDoc(doc($db, 'figures', id), {
      ...input,
      updatedAt: serverTimestamp(),
    })

  const removeFigure = (id: string) => deleteDoc(doc($db, 'figures', id))

  const importFigures = async (inputs: FigureInput[]): Promise<number> => {
    if (!inputs.length) return 0
    const chunkSize = 400
    let totalImported = 0

    for (let i = 0; i < inputs.length; i += chunkSize) {
      const chunk = inputs.slice(i, i + chunkSize)
      const batch = writeBatch($db)

      for (const item of chunk) {
        const newDocRef = doc(collection($db, 'figures'))
        batch.set(newDocRef, {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }

      await batch.commit()
      totalImported += chunk.length
    }

    return totalImported
  }

  return {
    figures,
    loaded,
    error,
    addFigure,
    updateFigure,
    removeFigure,
    importFigures,
  }
}
