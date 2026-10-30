<script setup lang="ts">
import { CUBE_COUNT, CUBE_COLS, SHELF_COUNT, type BookInput } from '~/composables/useBooks'
import type { Category } from '~/composables/useCategories'

const props = defineProps<{
  initial?: Partial<BookInput>
  excludeId?: string
  saving?: boolean
  submitLabel?: string
}>()
const emit = defineEmits<{ submit: [input: BookInput] }>()

const { books } = useBooks()
const { categories: categoryList } = useCategories()

const form = reactive<BookInput>({
  title: props.initial?.title ?? '',
  author: props.initial?.author ?? '',
  isbn: props.initial?.isbn ?? '',
  code: props.initial?.code ?? '',
  category: props.initial?.category ?? '',
  synopsis: props.initial?.synopsis ?? '',
  shelf: props.initial?.shelf ?? null,
  cube: props.initial?.cube ?? null,
  purchaseDate: props.initial?.purchaseDate ?? '',
  coverUrl: props.initial?.coverUrl ?? '',
  coverData: props.initial?.coverData ?? '',
})

const showScanner = ref(false)
const lookup = reactive({ state: 'idle' as 'idle' | 'loading' | 'found' | 'missing', text: '' })
const coverError = ref('')
const formError = ref('')

// ISBN yang sama sudah ada? (setiap judul hanya 1 eksemplar)
const duplicate = computed(() => {
  const isbn = cleanIsbn(form.isbn)
  if (!isbn) return null
  return books.value.find((b) => b.id !== props.excludeId && cleanIsbn(b.isbn) === isbn) ?? null
})

// Kategori yang sudah mengisi kubus terpilih
const cubeCategory = computed(() => {
  if (!form.shelf || !form.cube) return ''
  const inCube = books.value.find(
    (b) => b.id !== props.excludeId && b.shelf === form.shelf && b.cube === form.cube && b.category,
  )
  return inCube?.category ?? ''
})
const categoryMismatch = computed(
  () =>
    !!cubeCategory.value &&
    !!form.category.trim() &&
    form.category.trim().toLowerCase() !== cubeCategory.value.toLowerCase(),
)
watch(cubeCategory, (c) => {
  if (c && !form.category.trim()) form.category = c
})

// Temukan objek Category yang dipilih (untuk mendapat warna dll)
const selectedCategory = computed<Category | undefined>(() =>
  categoryList.value.find((c) => c.name === form.category),
)

// categories dari Firestore — lihat useCategories

const cubeLabel = (n: number) =>
  `Kubus ${n} (baris ${Math.ceil(n / CUBE_COLS)}, kolom ${((n - 1) % CUBE_COLS) + 1})`

const runLookup = async () => {
  const isbn = cleanIsbn(form.isbn)
  if (!isbn) {
    lookup.state = 'missing'
    lookup.text = 'Isi ISBN dulu.'
    return
  }
  lookup.state = 'loading'
  lookup.text = 'Mencari data buku…'
  const info = await lookupIsbn(isbn)
  if (!info) {
    lookup.state = 'missing'
    lookup.text = 'ISBN ini tidak ada di Google Books atau Open Library. Isi judul dan penulis manual.'
    return
  }
  if (!form.title.trim()) form.title = info.title
  if (!form.author.trim()) form.author = info.author
  if (info.coverUrl && !form.coverData) form.coverUrl = info.coverUrl
  lookup.state = 'found'
  lookup.text = 'Data buku terisi. Periksa lagi sebelum disimpan.'
}

const onScanned = async (isbn: string) => {
  showScanner.value = false
  form.isbn = isbn
  await runLookup()
}

const onCoverFile = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  coverError.value = ''
  try {
    form.coverData = await compressImage(file)
  } catch (err) {
    coverError.value = err instanceof Error ? err.message : 'Foto tidak bisa diproses.'
  }
  input.value = ''
}

const clearCover = () => {
  form.coverData = ''
  form.coverUrl = ''
}

const submit = () => {
  formError.value = ''
  if (!form.title.trim()) {
    formError.value = 'Judul wajib diisi.'
    return
  }
  if ((form.shelf && !form.cube) || (!form.shelf && form.cube)) {
    formError.value = 'Pilih rak dan kubus sekaligus, atau kosongkan keduanya.'
    return
  }
  emit('submit', {
    title: form.title.trim(),
    author: form.author.trim(),
    isbn: cleanIsbn(form.isbn),
    code: form.code.trim(),
    category: form.category.trim(),
    synopsis: form.synopsis.trim(),
    shelf: form.shelf,
    cube: form.cube,
    purchaseDate: form.purchaseDate,
    coverUrl: form.coverUrl,
    coverData: form.coverData,
  })
}
</script>

<template>
  <form class="form" @submit.prevent="submit">
    <section class="form-block">
      <h2>Cari lewat ISBN</h2>
      <div class="row">
        <input
          v-model="form.isbn"
          class="input"
          inputmode="numeric"
          placeholder="ISBN, misalnya 9786020000000"
          aria-label="ISBN"
          @keydown.enter.prevent="runLookup"
        />
        <button type="button" class="btn" @click="runLookup">Cari data</button>
        <button type="button" class="btn btn-primary" @click="showScanner = true">Scan barcode</button>
      </div>
      <IsbnScanner v-if="showScanner" @detected="onScanned" @close="showScanner = false" />
      <p v-if="lookup.state !== 'idle'" class="hint" :class="{ warn: lookup.state === 'missing' }">
        {{ lookup.text }}
      </p>
      <p v-if="duplicate" class="hint warn">
        ISBN ini sudah ada di koleksi: <NuxtLink :to="`/buku/${duplicate.id}`">{{ duplicate.title }}</NuxtLink>.
      </p>
    </section>

    <section class="form-block">
      <h2>Data buku</h2>
      <label class="field">
        <span>Judul</span>
        <input v-model="form.title" class="input" required />
      </label>
      <label class="field">
        <span>Penulis</span>
        <input v-model="form.author" class="input" />
      </label>
      <div class="grid-2">
        <label class="field">
          <span>Kode buku</span>
          <input v-model="form.code" class="input" />
        </label>
        <label class="field">
          <span>Tanggal beli</span>
          <input v-model="form.purchaseDate" type="date" class="input" />
        </label>
      </div>
      <label class="field">
        <span>Kategori</span>
        <select v-model="form.category" class="input">
          <option value="">— Pilih kategori —</option>
          <option v-for="cat in categoryList" :key="cat.id" :value="cat.name">
            {{ cat.name }}{{ cat.description ? ` — ${cat.description}` : '' }}
          </option>
        </select>
        <p v-if="!categoryList.length" class="hint warn">
          Belum ada kategori.
          <NuxtLink to="/kategori">Tambah kategori dulu</NuxtLink> sebelum mengisi buku.
        </p>
      </label>
      <label class="field">
        <span>Sinopsis / deskripsi <span class="field-opt">(opsional)</span></span>
        <textarea
          v-model="form.synopsis"
          class="input textarea"
          rows="5"
          placeholder="Ringkasan isi buku, catatan pribadi, kesan setelah membaca…"
        />
      </label>
    </section>

    <section class="form-block">
      <h2>Letak di rak</h2>
      <div class="grid-2">
        <label class="field">
          <span>Rak</span>
          <select v-model.number="form.shelf" class="input">
            <option :value="null">Belum ditempatkan</option>
            <option v-for="s in SHELF_COUNT" :key="s" :value="s">Rak {{ s }}</option>
          </select>
        </label>
        <label class="field">
          <span>Kubus</span>
          <select v-model.number="form.cube" class="input">
            <option :value="null">Belum ditempatkan</option>
            <option v-for="n in CUBE_COUNT" :key="n" :value="n">{{ cubeLabel(n) }}</option>
          </select>
        </label>
      </div>
      <p v-if="cubeCategory && !categoryMismatch" class="hint">
        Kubus ini sudah berisi kategori {{ cubeCategory }}.
      </p>
      <p v-if="categoryMismatch" class="hint warn">
        Kubus ini sudah berisi kategori {{ cubeCategory }}. Isi satu kubus dengan satu kategori dulu
        sebelum pindah ke kubus berikutnya.
      </p>
    </section>

    <section class="form-block">
      <h2>Sampul</h2>
      <div class="cover-edit">
        <div class="cover-edit-preview">
          <BookCover :book="{ title: form.title || 'Tanpa judul', coverData: form.coverData, coverUrl: form.coverUrl }" />
        </div>
        <div class="cover-edit-actions">
          <label class="btn">
            Pilih atau foto sampul
            <input type="file" accept="image/*" hidden @change="onCoverFile" />
          </label>
          <button v-if="form.coverData || form.coverUrl" type="button" class="btn" @click="clearCover">
            Hapus sampul
          </button>
          <p class="hint">
            Foto dikecilkan otomatis sebelum disimpan. Sampul dari hasil pencarian ISBN dipakai bila
            kamu tidak memilih foto sendiri.
          </p>
          <p v-if="coverError" class="hint warn">{{ coverError }}</p>
        </div>
      </div>
    </section>

    <p v-if="formError" class="hint warn" role="alert">{{ formError }}</p>
    <button class="btn btn-primary btn-wide" :disabled="saving">
      {{ saving ? 'Menyimpan…' : submitLabel || 'Simpan buku' }}
    </button>
  </form>
</template>
