<script setup lang="ts">
import { SHELF_COUNT, CUBE_COUNT } from '~/composables/useBooks'
import { useFigures, type FigureInput, type FigureSize } from '~/composables/useFigures'
import { canonicalAnime, sizeLabel, uniqueAnime } from '~/utils/figure'

definePageMeta({ middleware: 'owner' })
useHead({ title: 'Impor Action Figure · Perpustakaan Mini' })

const { figures, importFigures } = useFigures()

const jsonText = ref('')
const parseError = ref<string | null>(null)
const skipExistingNames = ref(true)
const hasChecked = ref(false)

const isImporting = ref(false)
const importSuccessCount = ref<number | null>(null)
const importError = ref<string | null>(null)

interface ParsedRow {
  index: number
  figure: FigureInput
  errors: string[]
  isDuplicateName: boolean
  status: 'valid' | 'skipped' | 'error'
}

const rows = ref<ParsedRow[]>([])

const isValidYMD = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

const checkData = () => {
  parseError.value = null
  importSuccessCount.value = null
  importError.value = null
  hasChecked.value = true

  const trimmed = jsonText.value.trim()
  if (!trimmed) {
    parseError.value = 'Data JSON tidak boleh kosong.'
    rows.value = []
    return
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (e) {
    parseError.value = `JSON tidak valid: ${e instanceof Error ? e.message : 'Format JSON rusak'}.`
    rows.value = []
    return
  }

  let items: unknown[]
  if (Array.isArray(parsed)) {
    items = parsed
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    if (Array.isArray(obj.figures)) {
      items = obj.figures
    } else {
      items = [parsed]
    }
  } else {
    parseError.value = 'Format JSON harus berupa array objek atau objek dengan properti "figures".'
    rows.value = []
    return
  }

  if (items.length === 0) {
    parseError.value = 'JSON tidak memuat data figure.'
    rows.value = []
    return
  }

  if (items.length > 500) {
    parseError.value = `Batas maksimal impor adalah 500 baris (ditemukan ${items.length} baris). Pecah menjadi beberapa batch.`
    rows.value = []
    return
  }

  // Anime yang sudah ada di database
  const knownAnime = uniqueAnime(figures.value)

  // Tracker ejaan anime di dalam batch JSON
  const localAnimeList = [...knownAnime]

  // Set nama figure yang sudah ada di database (lowercase)
  const existingNamesLower = new Set(figures.value.map((f) => f.name.trim().toLowerCase()))

  const parsedRows: ParsedRow[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const rowNum = i + 1
    const errors: string[] = []

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      parsedRows.push({
        index: rowNum,
        figure: {
          name: '',
          anime: '',
          size: 'medium',
          purchaseDate: '',
          photoData: '',
          shelf: null,
          cube: null,
        },
        errors: ['Baris bukan objek data figure yang valid.'],
        isDuplicateName: false,
        status: 'error',
      })
      continue
    }

    const obj = item as Record<string, unknown>

    const name = typeof obj.name === 'string' ? obj.name.trim() : (obj.name ? String(obj.name).trim() : '')
    const rawAnime = typeof obj.anime === 'string' ? obj.anime.trim() : (obj.anime ? String(obj.anime).trim() : '')
    const rawSize = typeof obj.size === 'string' ? obj.size.trim().toLowerCase() : ''
    const purchaseDate = typeof obj.purchaseDate === 'string' ? obj.purchaseDate.trim() : (obj.purchaseDate ? String(obj.purchaseDate).trim() : '')

    // Shelf & Cube parsing
    let shelf: number | null = null
    let shelfInvalid = false
    if (obj.shelf !== undefined && obj.shelf !== null && obj.shelf !== '') {
      const n = typeof obj.shelf === 'number' ? obj.shelf : Number(obj.shelf)
      if (Number.isInteger(n)) shelf = n
      else shelfInvalid = true
    }

    let cube: number | null = null
    let cubeInvalid = false
    if (obj.cube !== undefined && obj.cube !== null && obj.cube !== '') {
      const n = typeof obj.cube === 'number' ? obj.cube : Number(obj.cube)
      if (Number.isInteger(n)) cube = n
      else cubeInvalid = true
    }

    // ── Validasi Error ──
    // 1. Nama wajib & maks 200 karakter
    if (!name) {
      errors.push('Nama wajib diisi.')
    } else if (name.length > 200) {
      errors.push(`Nama terlalu panjang (${name.length} karakter, maksimal 200).`)
    }

    // 2. Size harus dikenal ('besar', 'medium', 'kecil')
    let size: FigureSize = 'medium'
    if (!rawSize) {
      size = 'medium'
    } else if (['besar', 'medium', 'kecil'].includes(rawSize)) {
      size = rawSize as FigureSize
    } else {
      errors.push(`Ukuran "${obj.size}" tidak dikenal (pilihan: besar, medium, kecil).`)
    }

    // 3. Anime maksimal 100 karakter
    if (rawAnime.length > 100) {
      errors.push(`Nama anime terlalu panjang (${rawAnime.length} karakter, maksimal 100).`)
    }

    // Canonicalize anime terhadap DB dan baris sebelumnya
    const canonical = canonicalAnime(rawAnime, localAnimeList)
    if (canonical && !localAnimeList.some((a) => a.toLowerCase() === canonical.toLowerCase())) {
      localAnimeList.push(canonical)
    }

    // 4. Tanggal beli YYYY-MM-DD bila diisi
    if (purchaseDate && !isValidYMD(purchaseDate)) {
      errors.push(`Tanggal beli "${purchaseDate}" bukan format YYYY-MM-DD.`)
    }

    // 5. Rak & Kubus harus berpasangan
    const hasShelf = shelf !== null || shelfInvalid
    const hasCube = cube !== null || cubeInvalid
    if ((hasShelf && !hasCube) || (!hasShelf && hasCube)) {
      errors.push('Pilih rak dan kubus sekaligus, atau kosongkan keduanya.')
    }

    if (hasShelf) {
      if (shelfInvalid || shelf === null || shelf < 1 || shelf > SHELF_COUNT) {
        errors.push(`Rak di luar rentang 1 sampai ${SHELF_COUNT}.`)
      }
    }
    if (hasCube) {
      if (cubeInvalid || cube === null || cube < 1 || cube > CUBE_COUNT) {
        errors.push(`Kubus di luar rentang 1 sampai ${CUBE_COUNT}.`)
      }
    }

    // ── Cek Duplikat Nama ──
    const isDuplicate = name ? existingNamesLower.has(name.toLowerCase()) : false

    let status: 'valid' | 'skipped' | 'error' = 'valid'
    if (errors.length > 0) {
      status = 'error'
    } else if (skipExistingNames.value && isDuplicate) {
      status = 'skipped'
    }

    parsedRows.push({
      index: rowNum,
      figure: {
        name,
        anime: canonical,
        size,
        purchaseDate,
        photoData: '',
        shelf,
        cube,
      },
      errors,
      isDuplicateName: isDuplicate,
      status,
    })
  }

  rows.value = parsedRows
}

// Watch checkbox lewati duplikat nama untuk memperbarui status
watch(skipExistingNames, () => {
  for (const r of rows.value) {
    if (r.errors.length > 0) {
      r.status = 'error'
    } else if (skipExistingNames.value && r.isDuplicateName) {
      r.status = 'skipped'
    } else {
      r.status = 'valid'
    }
  }
})

const validRows = computed(() => rows.value.filter((r) => r.status === 'valid'))
const validCount = computed(() => validRows.value.length)
const invalidCount = computed(() => rows.value.filter((r) => r.status === 'error').length)
const skippedCount = computed(() => rows.value.filter((r) => r.status === 'skipped').length)

const runImport = async () => {
  const toImport = validRows.value.map((r) => r.figure)
  if (!toImport.length || isImporting.value) return

  isImporting.value = true
  importError.value = null
  importSuccessCount.value = null

  try {
    const count = await importFigures(toImport)
    importSuccessCount.value = count
    jsonText.value = ''
  } catch (e) {
    importError.value = e instanceof Error ? e.message : 'Gagal menyimpan ke Firestore.'
  } finally {
    isImporting.value = false
  }
}

const fillSample = () => {
  jsonText.value = `[
  { "name": "Iron Man Mark 85", "size": "besar", "purchaseDate": "2024-03-15", "shelf": 1, "cube": 3 },
  { "name": "Monkey D. Luffy", "anime": "One Piece", "size": "medium" },
  { "name": "Roronoa Zoro", "anime": "one piece", "size": "medium" }
]`
  checkData()
}
</script>

<template>
  <section class="import-page">
    <NuxtLink to="/figure" class="back">← Kembali ke daftar figure</NuxtLink>

    <div class="intro">
      <h1>Impor Action Figure</h1>
      <p class="lede">
        Tempel data JSON untuk memasukkan banyak figure ke koleksi sekaligus.
      </p>
    </div>

    <!-- Input Card -->
    <div class="form-block import-input-card">
      <div class="form-block-head">
        <span class="step-badge" aria-hidden="true">1</span>
        <h2>Tempel Data JSON</h2>
      </div>

      <label class="field">
        <span class="field-label-row">
          <span>JSON Figure</span>
          <button type="button" class="link-sample" @click="fillSample">
            Isi contoh JSON
          </button>
        </span>
        <textarea
          v-model="jsonText"
          class="input textarea json-textarea"
          rows="8"
          placeholder="[&#10;  { &quot;name&quot;: &quot;Monkey D. Luffy&quot;, &quot;anime&quot;: &quot;One Piece&quot;, &quot;size&quot;: &quot;medium&quot; }&#10;]"
          spellcheck="false"
        />
        <p class="hint">
          Catatan: Foto figure tidak diimpor lewat JSON dan dapat ditambahkan nanti lewat form ubah tiap figure.
        </p>
      </label>

      <!-- Opsi Centang Lewati Nama yang Sudah Ada -->
      <div class="import-options">
        <label class="checkbox-label">
          <input v-model="skipExistingNames" type="checkbox" />
          <span>Lewati nama yang sudah ada di koleksi (tidak peka huruf besar/kecil)</span>
        </label>
      </div>

      <div class="import-input-actions">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!jsonText.trim() || isImporting"
          @click="checkData"
        >
          <IconsIconSearch :size="16" />
          <span>Periksa data</span>
        </button>
        <button
          v-if="jsonText"
          type="button"
          class="btn btn-ghost"
          :disabled="isImporting"
          @click="jsonText = ''; rows = []; parseError = null; hasChecked = false"
        >
          Bersihkan
        </button>
      </div>

      <p v-if="parseError" class="notice warn" role="alert">
        {{ parseError }}
      </p>
    </div>

    <!-- Pratinjau Pemeriksaan -->
    <div v-if="hasChecked && !parseError && rows.length" class="import-preview-section">
      <div class="preview-header">
        <div class="form-block-head">
          <span class="step-badge" aria-hidden="true">2</span>
          <h2>Pratinjau Impor</h2>
        </div>

        <div class="import-stats">
          <span class="stat-pill total">Total: {{ rows.length }}</span>
          <span class="stat-pill valid">{{ validCount }} valid</span>
          <span v-if="invalidCount" class="stat-pill error">{{ invalidCount }} tidak valid</span>
          <span v-if="skippedCount" class="stat-pill warn">{{ skippedCount }} dilewati</span>
        </div>
      </div>

      <!-- Tabel Pratinjau -->
      <div class="table-container">
        <table class="book-table import-table">
          <caption class="sr-only">Pratinjau data action figure sebelum diimpor</caption>
          <thead>
            <tr>
              <th scope="col" class="col-no">No</th>
              <th scope="col" class="col-title">Nama</th>
              <th scope="col">Anime (Diseragamkan)</th>
              <th scope="col">Ukuran</th>
              <th scope="col">Tgl Beli</th>
              <th scope="col">Letak</th>
              <th scope="col" class="col-status">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in rows"
              :key="r.index"
              :class="{
                'row-error': r.status === 'error',
                'row-warn': r.status === 'skipped',
                'row-valid': r.status === 'valid',
              }"
            >
              <td class="col-no">{{ r.index }}</td>
              <td class="col-title">
                <strong>{{ r.figure.name || '(Nama kosong)' }}</strong>
              </td>
              <td>
                <span v-if="r.figure.anime" class="table-cat-badge anime-badge">
                  {{ r.figure.anime }}
                </span>
                <span v-else class="cell-empty">-</span>
              </td>
              <td>
                <span class="badge-size" :class="`size-${r.figure.size}`">
                  {{ sizeLabel(r.figure.size) }}
                </span>
              </td>
              <td>
                <span v-if="r.figure.purchaseDate">{{ r.figure.purchaseDate }}</span>
                <span v-else class="cell-empty">-</span>
              </td>
              <td>
                <span v-if="r.figure.shelf && r.figure.cube">
                  Rak {{ r.figure.shelf }}, Kubus {{ r.figure.cube }}
                </span>
                <span v-else class="cell-empty">-</span>
              </td>
              <td class="col-status">
                <div class="status-cell">
                  <span
                    class="status-badge"
                    :class="{
                      'badge-valid': r.status === 'valid',
                      'badge-warn': r.status === 'skipped',
                      'badge-error': r.status === 'error',
                    }"
                  >
                    {{
                      r.status === 'valid'
                        ? 'Valid'
                        : r.status === 'skipped'
                          ? 'Dilewati (nama sudah ada)'
                          : 'Tidak valid'
                    }}
                  </span>

                  <ul v-if="r.errors.length" class="status-messages error-list">
                    <li v-for="(err, ei) in r.errors" :key="ei">{{ err }}</li>
                  </ul>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Action Bar -->
      <div class="import-action-bar">
        <div v-if="importSuccessCount !== null" class="import-summary-box">
          <p class="notice success" role="status">
            ✓ <strong>Berhasil mengimpor {{ importSuccessCount }} figure ke koleksi!</strong>
            <NuxtLink to="/figure" class="view-list-link">Lihat daftar figure →</NuxtLink>
          </p>
        </div>

        <p v-if="importError" class="notice warn" role="alert">
          {{ importError }}
        </p>

        <button
          type="button"
          class="btn btn-primary btn-import"
          :disabled="validCount === 0 || isImporting || importSuccessCount !== null"
          @click="runImport"
        >
          <IconsIconUpload :size="18" />
          <span>{{ isImporting ? 'Menyimpan…' : `Impor ${validCount} figure` }}</span>
        </button>
      </div>
    </div>
  </section>
</template>
