<script setup lang="ts">
import type { BookInput } from '~/composables/useBooks'

definePageMeta({ middleware: 'owner' })
useHead({ title: 'Tambah buku · Perpustakaan Mini' })

const route = useRoute()
const { addBook } = useBooks()
const saving = ref(false)
const error = ref('')

const toNum = (v: unknown) => {
  const n = Number(Array.isArray(v) ? v[0] : v)
  return Number.isInteger(n) && n > 0 ? n : null
}
const initial = { shelf: toNum(route.query.rak), cube: toNum(route.query.kubus) }

const save = async (input: BookInput) => {
  saving.value = true
  error.value = ''
  try {
    const id = await addBook(input)
    await navigateTo(`/buku/${id}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Buku gagal disimpan.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="narrow">
    <div class="intro"><h1>Tambah buku</h1></div>
    <p v-if="error" class="notice warn" role="alert">{{ error }}</p>
    <BookForm :initial="initial" :saving="saving" submit-label="Simpan buku" @submit="save" />
  </section>
</template>
