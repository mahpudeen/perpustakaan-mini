<script setup lang="ts">
const { user, isOwner, logOut } = useAuth()
const route = useRoute()

const leave = async () => {
  await logOut()
  if (route.path === '/tambah') await navigateTo('/')
}

const scrolled = ref(false)
const onScroll = () => {
  scrolled.value = window.scrollY > 8
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="page">
    <header class="top" :class="{ scrolled }">
      <NuxtLink to="/" class="brand">
        <IconsIconLogo :size="24" />
        <span>Perpustakaan Mini</span>
      </NuxtLink>

      <nav class="nav nav-desktop" aria-label="Utama">
        <NuxtLink to="/">
          <IconsIconList :size="18" />
          <span>Daftar buku</span>
        </NuxtLink>
        <NuxtLink to="/rak">
          <IconsIconShelf :size="18" />
          <span>Rak</span>
        </NuxtLink>
        <NuxtLink v-if="isOwner" to="/kategori">
          <IconsIconTag :size="18" />
          <span>Kategori</span>
        </NuxtLink>
        <NuxtLink v-if="isOwner" to="/tambah" class="nav-add">
          <IconsIconPlus :size="18" />
          <span>Tambah buku</span>
        </NuxtLink>
      </nav>

      <div class="auth">
        <button v-if="user" class="link auth-btn" type="button" @click="leave">
          <IconsIconLogout :size="16" />
          <span>Keluar</span>
        </button>
        <NuxtLink v-else to="/masuk" class="link auth-btn">
          <IconsIconLogin :size="16" />
          <span>Masuk</span>
        </NuxtLink>
      </div>
    </header>

    <main class="main">
      <slot />
    </main>

    <!-- Mobile bottom tab bar -->
    <nav class="bottom-bar" aria-label="Navigasi bawah">
      <NuxtLink to="/" class="tab-item">
        <IconsIconList :size="20" />
        <span>Daftar</span>
      </NuxtLink>
      <NuxtLink to="/rak" class="tab-item">
        <IconsIconShelf :size="20" />
        <span>Rak</span>
      </NuxtLink>
      <NuxtLink v-if="isOwner" to="/kategori" class="tab-item">
        <IconsIconTag :size="20" />
        <span>Kategori</span>
      </NuxtLink>
      <NuxtLink v-if="isOwner" to="/tambah" class="tab-item tab-add">
        <span class="tab-icon-wrap">
          <IconsIconPlus :size="18" />
        </span>
        <span>Tambah</span>
      </NuxtLink>
    </nav>
  </div>
</template>
