import { GoogleAuthProvider, signInWithPopup, signOut, type User } from 'firebase/auth'

export const useAuth = () => {
  const { $auth } = useNuxtApp()
  const user = useState<User | null>('auth-user', () => null)
  const ready = useState<boolean>('auth-ready', () => false)
  const ownerUid = useRuntimeConfig().public.ownerUid as string

  // Hanya untuk menampilkan/menyembunyikan tombol. Yang benar-benar
  // melindungi data adalah firestore.rules.
  const isOwner = computed(() => !!user.value && !!ownerUid && user.value.uid === ownerUid)

  const waitReady = () =>
    new Promise<void>((resolve) => {
      if (ready.value) return resolve()
      const stop = watch(ready, (v) => {
        if (v) {
          stop()
          resolve()
        }
      })
    })

  const signIn = () => signInWithPopup($auth, new GoogleAuthProvider())
  const logOut = () => signOut($auth)

  return { user, ready, isOwner, ownerUid, waitReady, signIn, logOut }
}
