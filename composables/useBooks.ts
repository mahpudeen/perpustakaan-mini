import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'

export interface Book {
  id: string
  title: string
  author: string
  isbn: string
  code: string
  category: string
  synopsis: string // sinopsis/deskripsi buku
  shelf: number | null // 1 atau 2
  cube: number | null // 1 sampai 15
  purchaseDate: string // YYYY-MM-DD
  coverUrl: string // dari Google Books / Open Library
  coverData: string // data:image/webp;base64,... (foto manual, sudah dikompres)
}
export type BookInput = Omit<Book, 'id'>

export const SHELF_COUNT = 2
export const CUBE_COUNT = 15
export const CUBE_COLS = 3

export const useBooks = () => {
  const { $db } = useNuxtApp()
  const books = useState<Book[]>('books', () => [])
  const loaded = useState<boolean>('books-loaded', () => false)
  const error = useState<string | null>('books-error', () => null)
  const subscribed = useState<boolean>('books-subscribed', () => false)

  if (!subscribed.value) {
    subscribed.value = true
    onSnapshot(
      collection($db, 'books'),
      (snap) => {
        books.value = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Book, 'id'>) }))
          .sort((a, b) => a.title.localeCompare(b.title, 'id'))
        loaded.value = true
        error.value = null
      },
      (err) => {
        error.value = err.message
        loaded.value = true
      },
    )
  }

  const addBook = async (input: BookInput) => {
    const ref = await addDoc(collection($db, 'books'), {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return ref.id
  }

  const updateBook = (id: string, input: BookInput) =>
    updateDoc(doc($db, 'books', id), { ...input, updatedAt: serverTimestamp() })

  const removeBook = (id: string) => deleteDoc(doc($db, 'books', id))

  return { books, loaded, error, addBook, updateBook, removeBook }
}
