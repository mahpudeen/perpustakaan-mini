<script setup lang="ts">
import type { BookInput } from '~/composables/useBooks'

const route = useRoute()
const id = route.params.id as string
const { books, loaded, updateBook, removeBook } = useBooks()
const { isOwner } = useAuth()

const book = computed(() => books.value.find((b) => b.id === id))
useHead({ title: computed(() => (book.value ? `${book.value.title} · Perpustakaan Mini` : 'Buku')) })

const editing = ref(false)
const saving = ref(false)
const error = ref('')

const dateText = computed(() => {
  const d = book.value?.purchaseDate
  if (!d) return ''
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('id-ID', { dateStyle: 'long' })
})

const save = async (input: BookInput) => {
  saving.value = true
  error.value = ''
  try {
    await updateBook(id, input)
    editing.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Perubahan gagal disimpan.'
  } finally {
    saving.value = false
  }
}

const remove = async () => {
  if (!book.value || !confirm(`Hapus "${book.value.title}" dari koleksi?`)) return
  try {
    await removeBook(id)
    await navigateTo('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Buku gagal dihapus.'
  }
}
</script>

<template>
  <section>
    <NuxtLink to="/" class="back">Kembali ke daftar</NuxtLink>

    <p v-if="!loaded" class="notice">Memuat buku…</p>
    <p v-else-if="!book" class="notice">Buku tidak ditemukan. Mungkin sudah dihapus.</p>

    <template v-else-if="editing">
      <div class="narrow">
        <div class="intro"><h1>Ubah buku</h1></div>
        <p v-if="error" class="notice warn" role="alert">{{ error }}</p>
        <BookForm
          :initial="book"
          :exclude-id="id"
          :saving="saving"
          submit-label="Simpan perubahan"
          @submit="save"
        />
        <button type="button" class="link cancel" @click="editing = false">Batal</button>
      </div>
    </template>

    <article v-else class="detail">
      <div class="detail-cover"><BookCover :book="book" /></div>
      <div class="detail-info">
        <h1>{{ book.title }}</h1>
        <p v-if="book.author" class="detail-author">{{ book.author }}</p>

        <dl class="facts">
          <div>
            <dt>Letak</dt>
            <dd>
              <template v-if="book.shelf && book.cube">
                <NuxtLink to="/rak">Rak {{ book.shelf }}, kubus {{ book.cube }}</NuxtLink>
              </template>
              <template v-else>Belum ditempatkan</template>
            </dd>
          </div>
          <div v-if="book.category"><dt>Kategori</dt><dd>{{ book.category }}</dd></div>
          <div v-if="book.code"><dt>Kode buku</dt><dd>{{ book.code }}</dd></div>
          <div v-if="book.isbn"><dt>ISBN</dt><dd>{{ book.isbn }}</dd></div>
          <div v-if="dateText"><dt>Dibeli</dt><dd>{{ dateText }}</dd></div>
        </dl>

        <div v-if="book.synopsis" class="synopsis">
          <h2 class="synopsis-title">Sinopsis</h2>
          <p class="synopsis-text">{{ book.synopsis }}</p>
        </div>

        <p v-if="error" class="notice warn" role="alert">{{ error }}</p>
        <div v-if="isOwner" class="detail-actions">
          <button type="button" class="btn btn-primary" @click="editing = true">Ubah</button>
          <button type="button" class="btn btn-danger" @click="remove">Hapus</button>
        </div>
      </div>
    </article>
  </section>
</template>
