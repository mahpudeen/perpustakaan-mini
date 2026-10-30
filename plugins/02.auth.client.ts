import { onAuthStateChanged, type User } from 'firebase/auth'

export default defineNuxtPlugin((nuxtApp) => {
  const user = useState<User | null>('auth-user', () => null)
  const ready = useState<boolean>('auth-ready', () => false)
  onAuthStateChanged(nuxtApp.$auth, (u) => {
    user.value = u
    ready.value = true
  })
})
