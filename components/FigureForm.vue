<script setup lang="ts">
import { SHELF_COUNT, CUBE_COUNT, CUBE_COLS } from '~/composables/useBooks'
import { useFigures, type FigureInput, type FigureSize } from '~/composables/useFigures'
import { canonicalAnime, cubeLoad, slotOf, uniqueAnime } from '~/utils/figure'
import { compressImage } from '~/utils/image'

const props = defineProps<{
  initial?: Partial<FigureInput>
  excludeId?: string
  saving?: boolean
  submitLabel?: string
}>()

const emit = defineEmits<{
  submit: [input: FigureInput]
}>()

const { figures } = useFigures()
const { books } = useBooks()

const existingAnime = computed(() => uniqueAnime(figures.value))

const form = reactive<FigureInput>({
  name: props.initial?.name ?? '',
  anime: props.initial?.anime ?? '',
  size: (props.initial?.size ?? 'medium') as FigureSize,
  purchaseDate: props.initial?.purchaseDate ?? '',
  photoData: props.initial?.photoData ?? '',
  shelf: props.initial?.shelf ?? null,
  cube: props.initial?.cube ?? null,
})

const photoError = ref('')
const formError = ref('')

const cubeLabel = (n: number) =>
  `Kubus ${n} (baris ${Math.ceil(n / CUBE_COLS)}, kolom ${((n - 1) % CUBE_COLS) + 1})`

// Warnings (tidak memblokir simpan)
const isCubeOverloaded = computed(() => {
  if (!form.shelf || !form.cube) return false
  const currentLoad = cubeLoad(figures.value, form.shelf, form.cube, props.excludeId)
  return currentLoad + slotOf(form.size) > 4
})

const booksInCubeCount = computed(() => {
  if (!form.shelf || !form.cube) return 0
  return books.value.filter((b) => b.shelf === form.shelf && b.cube === form.cube).length
})

const onPhotoFile = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  photoError.value = ''
  try {
    form.photoData = await compressImage(file)
  } catch (err) {
    photoError.value = err instanceof Error ? err.message : 'Foto tidak bisa diproses.'
  }
  input.value = ''
}

const clearPhoto = () => {
  form.photoData = ''
}

const submit = () => {
  formError.value = ''
  if (!form.name.trim()) {
    formError.value = 'Nama figure wajib diisi.'
    return
  }
  if ((form.shelf && !form.cube) || (!form.shelf && form.cube)) {
    formError.value = 'Pilih rak dan kubus sekaligus, atau kosongkan keduanya.'
    return
  }

  emit('submit', {
    name: form.name.trim(),
    anime: canonicalAnime(form.anime, existingAnime.value),
    size: form.size,
    purchaseDate: form.purchaseDate,
    photoData: form.photoData,
    shelf: form.shelf,
    cube: form.cube,
  })
}
</script>

<template>
  <form class="form" @submit.prevent="submit">
    <!-- 1. Nama Figure -->
    <section class="form-block">
      <div class="form-block-head">
        <span class="step-badge" aria-hidden="true">1</span>
        <h2>Data figure</h2>
      </div>

      <label class="field">
        <span>Nama figure</span>
        <input
          v-model="form.name"
          class="input"
          placeholder="Contoh: Monkey D. Luffy"
          required
        />
      </label>

      <!-- 2. Anime Combobox -->
      <label class="field" for="figure-anime-input">
        <span class="field-label-row">
          <span>Anime / Seri</span>
          <span class="field-opt">Opsional</span>
        </span>
        <UiComboInput
          id="figure-anime-input"
          v-model="form.anime"
          :options="existingAnime"
          placeholder="Contoh: One Piece"
        />
        <p class="hint">Pilih dari anime yang sudah ada atau ketik yang baru.</p>
      </label>

      <!-- 3. Size -->
      <div class="grid-2">
        <label class="field">
          <span>Ukuran (Size)</span>
          <select v-model="form.size" class="input">
            <option value="besar">Besar</option>
            <option value="medium">Medium</option>
            <option value="kecil">Kecil</option>
          </select>
          <p class="hint">Besar: 1 per kubus. Medium: 2 per kubus. Kecil: 4 per kubus.</p>
        </label>

        <!-- 4. Tanggal Beli -->
        <label class="field">
          <span>Tanggal beli</span>
          <input v-model="form.purchaseDate" type="date" class="input" />
        </label>
      </div>
    </section>

    <!-- 5. Letak di Rak -->
    <section class="form-block">
      <div class="form-block-head">
        <span class="step-badge" aria-hidden="true">2</span>
        <h2>Letak di rak</h2>
      </div>

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

      <!-- Warning Kubus Penuh (tidak memblokir) -->
      <p v-if="isCubeOverloaded" class="hint warn">
        Kubus ini sudah terisi dan tidak muat lagi menurut ukuran. Tetap bisa disimpan.
      </p>

      <!-- Warning Kubus Berisi Buku (tidak memblokir) -->
      <p v-if="booksInCubeCount > 0" class="hint warn">
        Kubus ini juga berisi {{ booksInCubeCount }} buku. Tetap bisa disimpan.
      </p>
    </section>

    <!-- 6. Foto -->
    <section class="form-block">
      <div class="form-block-head">
        <span class="step-badge" aria-hidden="true">3</span>
        <h2>Foto figure</h2>
      </div>

      <div class="cover-edit figure-cover-edit">
        <div class="figure-photo-preview">
          <img
            v-if="form.photoData"
            :src="form.photoData"
            :alt="form.name || 'Foto figure'"
            class="figure-photo-img"
          />
          <div v-else class="figure-photo-placeholder">
            <IconsIconFigure :size="38" />
            <span>Tanpa foto</span>
          </div>
        </div>

        <div class="cover-edit-actions">
          <div class="cover-edit-btns">
            <label class="btn btn-primary">
              <IconsIconUpload :size="16" />
              <span>Pilih atau foto figure</span>
              <input type="file" accept="image/*" hidden @change="onPhotoFile" />
            </label>
            <button v-if="form.photoData" type="button" class="btn btn-danger" @click="clearPhoto">
              Hapus foto
            </button>
          </div>
          <p class="hint">Foto dikecilkan otomatis sebelum disimpan ke Firestore.</p>
          <p v-if="photoError" class="hint warn">{{ photoError }}</p>
        </div>
      </div>
    </section>

    <p v-if="formError" class="notice warn" role="alert">{{ formError }}</p>

    <button class="btn btn-primary btn-wide btn-save-sticky" :disabled="saving">
      {{ saving ? 'Menyimpan…' : submitLabel || 'Simpan figure' }}
    </button>
  </form>
</template>
