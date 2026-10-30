import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

export default defineNuxtPlugin(() => {
  const c = useRuntimeConfig().public
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        apiKey: c.firebaseApiKey,
        authDomain: c.firebaseAuthDomain,
        projectId: c.firebaseProjectId,
        appId: c.firebaseAppId,
      })
  return { provide: { db: getFirestore(app), auth: getAuth(app) } }
})
