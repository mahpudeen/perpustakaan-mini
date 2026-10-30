<script setup lang="ts">
useHead({ title: 'Perpustakaan Mini' })
const { books, loaded, error } = useBooks()
const { categories: categoryList } = useCategories()

const q = ref('')
const cat = ref('')

const filtered = computed(() => {
  const t = q.value.trim().toLowerCase()
  return books.value.filter(
    (b) =>
      (!cat.value || b.category === cat.value) &&
      (!t || [b.title, b.author, b.code, b.isbn, b.category].some((f) => f?.toLowerCase().includes(t))),
  )
})
</script>

<template>
  <section>
    <div class="intro">
      <h1>Perpustakaan Mini</h1>
      <p v-if="loaded && !error" class="lede">{{ books.length }} buku di rak. Cari judul, penulis, atau kode.</p>
    </div>

    <input
      v-model="q"
      type="search"
      class="input search"
      placeholder="Cari buku"
      aria-label="Cari buku"
    />

    <div v-if="categoryList.length" class="chips" role="group" aria-label="Filter kategori">
      <button type="button" class="chip" :class="{ on: !cat }" @click="cat = ''">Semua</button>
      <button
        v-for="c in categoryList"
        :key="c.id"
        type="button"
        class="chip"
        :class="{ on: cat === c.name }"
        @click="cat = cat === c.name ? '' : c.name"
      >
        {{ c.name }}
      </button>
    </div>

    <p v-if="error" class="notice warn">
      Data belum bisa dimuat. Periksa konfigurasi Firebase dan aturan Firestore.
    </p>
    <p v-else-if="!loaded" class="notice">Memuat buku…</p>
    <p v-else-if="!books.length" class="notice">
      Belum ada buku. Masuk sebagai pemilik, lalu pilih Tambah buku.
    </p>
    <p v-else-if="!filtered.length" class="notice">Tidak ada buku yang cocok dengan pencarian ini.</p>

    <div v-else class="grid">
      <BookCard v-for="b in filtered" :key="b.id" :book="b" />
    </div>
  </section>
</template>
