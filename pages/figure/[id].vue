<script setup lang="ts">
import type { FigureInput } from '~/composables/useFigures'
import { sizeLabel } from '~/utils/figure'
import { formatTanggal } from '~/utils/bookTable'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string
const { figures, loaded, updateFigure, removeFigure } = useFigures()
const { isOwner } = useAuth()
const listQuery = useState<Record<string, any>>('figure-list-query', () => ({}))

const figure = computed(() => figures.value.find((f) => f.id === id))
useHead({
  title: computed(() => (figure.value ? `${figure.value.name} · Perpustakaan Mini` : 'Figure')),
})

const editing = ref(route.query.ubah === '1')
const saving = ref(false)
const error = ref('')

watch(editing, (isEditing) => {
  if (!isEditing && route.query.ubah) {
    const q = { ...route.query }
    delete q.ubah
    router.replace({ query: q })
  }
})

const save = async (input: FigureInput) => {
  saving.value = true
  error.value = ''
  try {
    await updateFigure(id, input)
    editing.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Perubahan gagal disimpan.'
  } finally {
    saving.value = false
  }
}

const remove = async () => {
  if (!figure.value || !confirm(`Hapus "${figure.value.name}" dari koleksi figure?`)) return
  try {
    await removeFigure(id)
    await navigateTo('/figure')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Figure gagal dihapus.'
  }
}
</script>

<template>
  <section>
    <NuxtLink :to="{ path: '/figure', query: listQuery }" class="back">← Kembali ke daftar figure</NuxtLink>

    <p v-if="!loaded" class="notice">Memuat figure…</p>
    <p v-else-if="!figure" class="notice">Figure tidak ditemukan. Mungkin sudah dihapus.</p>

    <!-- Mode Ubah (Hanya Pemilik) -->
    <template v-else-if="editing && isOwner">
      <div class="narrow">
        <div class="intro"><h1>Ubah figure</h1></div>
        <p v-if="error" class="notice warn" role="alert">{{ error }}</p>
        <FigureForm
          :initial="figure"
          :exclude-id="id"
          :saving="saving"
          submit-label="Simpan perubahan"
          @submit="save"
        />
        <button type="button" class="link cancel" @click="editing = false">Batal</button>
      </div>
    </template>

    <!-- Tampilan Detail Figure -->
    <article v-else class="detail figure-detail">
      <div class="detail-cover figure-detail-cover">
        <img
          v-if="figure.photoData"
          :src="figure.photoData"
          :alt="figure.name"
          class="figure-detail-img"
        />
        <div v-else class="figure-photo-placeholder large">
          <IconsIconFigure :size="64" />
          <span>Tanpa foto</span>
        </div>
      </div>

      <div class="detail-info">
        <h1>{{ figure.name }}</h1>
        <p v-if="figure.anime" class="detail-author figure-anime">
          Seri:
          <NuxtLink :to="{ path: '/figure', query: { anime: figure.anime } }">
            {{ figure.anime }}
          </NuxtLink>
        </p>

        <dl class="facts">
          <div>
            <dt>Ukuran</dt>
            <dd>
              <span class="badge-size" :class="`size-${figure.size}`">
                {{ sizeLabel(figure.size) }}
              </span>
            </dd>
          </div>
          <div>
            <dt>Letak</dt>
            <dd>
              <template v-if="figure.shelf && figure.cube">
                <NuxtLink to="/rak">Rak {{ figure.shelf }}, kubus {{ figure.cube }}</NuxtLink>
              </template>
              <template v-else>Belum ditempatkan</template>
            </dd>
          </div>
          <div v-if="figure.purchaseDate">
            <dt>Dibeli</dt>
            <dd>{{ formatTanggal(figure.purchaseDate) }}</dd>
          </div>
        </dl>

        <p v-if="error" class="notice warn" role="alert">{{ error }}</p>

        <div v-if="isOwner" class="detail-actions">
          <button type="button" class="btn btn-primary" @click="editing = true">Ubah</button>
          <button type="button" class="btn btn-danger" @click="remove">Hapus</button>
        </div>
      </div>
    </article>
  </section>
</template>
