import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'

export interface Category {
  id: string
  name: string
  color: string // hex warna punggung buku di rak
  description: string
}
export type CategoryInput = Omit<Category, 'id'>

const PALETTE = [
  '#4f7fe8', '#e07b4a', '#5cb97a', '#c45c8a', '#8e6fc1',
  '#e8a93d', '#4db8c2', '#d45b5b', '#78a856', '#a07040',
]

export const randomColor = () => PALETTE[Math.floor(Math.random() * PALETTE.length)]

export const useCategories = () => {
  const { $db } = useNuxtApp()
  const categories = useState<Category[]>('categories', () => [])
  const loaded = useState<boolean>('categories-loaded', () => false)
  const error = useState<string | null>('categories-error', () => null)
  const subscribed = useState<boolean>('categories-subscribed', () => false)

  if (!subscribed.value) {
    subscribed.value = true
    onSnapshot(
      query(collection($db, 'categories'), orderBy('name')),
      (snap) => {
        categories.value = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Category, 'id'>),
        }))
        loaded.value = true
        error.value = null
      },
      (err) => {
        error.value = err.message
        loaded.value = true
      },
    )
  }

  const addCategory = (input: CategoryInput) =>
    addDoc(collection($db, 'categories'), {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

  const updateCategory = (id: string, input: CategoryInput) =>
    updateDoc(doc($db, 'categories', id), { ...input, updatedAt: serverTimestamp() })

  const removeCategory = (id: string) => deleteDoc(doc($db, 'categories', id))

  return { categories, loaded, error, addCategory, updateCategory, removeCategory }
}
