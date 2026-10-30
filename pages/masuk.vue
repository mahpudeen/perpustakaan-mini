<script setup lang="ts">
useHead({ title: 'Masuk · Perpustakaan Mini' })
const { user, ready, isOwner, ownerUid, signIn, logOut } = useAuth()
const error = ref('')

const login = async () => {
  error.value = ''
  try {
    await signIn()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal masuk.'
  }
}

watch(
  isOwner,
  (v) => {
    if (v) navigateTo('/')
  },
  { immediate: true },
)
</script>

<template>
  <section class="narrow">
    <div class="intro">
      <h1>Masuk</h1>
      <p class="lede">Hanya pemilik perpustakaan yang bisa menambah dan mengubah buku.</p>
    </div>

    <p v-if="!ready" class="notice">Memeriksa sesi…</p>

    <template v-else-if="!user">
      <button type="button" class="btn btn-primary" @click="login">Masuk dengan Google</button>
      <p v-if="error" class="notice warn" role="alert">{{ error }}</p>
    </template>

    <template v-else-if="!isOwner">
      <p class="notice warn">
        Akun {{ user.email }} bukan pemilik perpustakaan ini.
        <template v-if="!ownerUid">Variabel NUXT_PUBLIC_OWNER_UID belum diisi.</template>
      </p>
      <div class="uid-box">
        <p>UID akun ini (untuk NUXT_PUBLIC_OWNER_UID dan firestore.rules):</p>
        <code>{{ user.uid }}</code>
      </div>
      <button type="button" class="btn" @click="logOut">Keluar</button>
    </template>
  </section>
</template>
