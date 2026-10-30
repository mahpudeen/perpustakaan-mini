<script setup lang="ts">
const { user, isOwner, logOut } = useAuth()
const route = useRoute()

const leave = async () => {
  await logOut()
  if (route.path === '/tambah') await navigateTo('/')
}
</script>

<template>
  <div class="page">
    <header class="top">
      <NuxtLink to="/" class="brand">Perpustakaan Mini</NuxtLink>
      <nav class="nav" aria-label="Utama">
        <NuxtLink to="/">Daftar buku</NuxtLink>
        <NuxtLink to="/rak">Rak</NuxtLink>
        <NuxtLink v-if="isOwner" to="/kategori">Kategori</NuxtLink>
        <NuxtLink v-if="isOwner" to="/tambah" class="nav-add">Tambah buku</NuxtLink>
      </nav>
      <div class="auth">
        <button v-if="user" class="link" type="button" @click="leave">Keluar</button>
        <NuxtLink v-else to="/masuk" class="link">Masuk</NuxtLink>
      </div>
    </header>
    <main class="main">
      <slot />
    </main>
  </div>
</template>
