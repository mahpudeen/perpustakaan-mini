<script setup lang="ts">
import type { FigureInput } from '~/composables/useFigures'

definePageMeta({ middleware: 'owner' })
useHead({ title: 'Tambah action figure · Perpustakaan Mini' })

const route = useRoute()
const { addFigure } = useFigures()
const saving = ref(false)
const error = ref('')

const toNum = (v: unknown) => {
  const n = Number(Array.isArray(v) ? v[0] : v)
  return Number.isInteger(n) && n > 0 ? n : null
}
const initial = { shelf: toNum(route.query.rak), cube: toNum(route.query.kubus) }

const save = async (input: FigureInput) => {
  saving.value = true
  error.value = ''
  try {
    const id = await addFigure(input)
    await navigateTo(`/figure/${id}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Figure gagal disimpan.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="narrow">
    <NuxtLink to="/figure" class="back">← Kembali ke daftar figure</NuxtLink>
    <div class="intro">
      <h1>Tambah action figure</h1>
      <p class="lede">Isi data koleksi action figure baru dan tentukan letaknya di rak.</p>
    </div>
    <p v-if="error" class="notice warn" role="alert">{{ error }}</p>
    <FigureForm :initial="initial" :saving="saving" submit-label="Simpan figure" @submit="save" />
  </section>
</template>
