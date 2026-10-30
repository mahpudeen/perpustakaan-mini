export default defineNuxtRouteMiddleware(async () => {
  const { waitReady, isOwner } = useAuth()
  await waitReady()
  if (!isOwner.value) return navigateTo('/masuk')
})
