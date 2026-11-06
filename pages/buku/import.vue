<script setup lang="ts">
import { parseAndValidateBooks, type ImportRow } from '~/utils/importBooks'

definePageMeta({ middleware: 'owner' })
useHead({ title: 'Import JSON · Perpustakaan Mini' })

const { books, addBook } = useBooks()
const { categories: categoryList } = useCategories()

const jsonText = ref('')
const parseError = ref<string | null>(null)
const rows = ref<ImportRow[]>([])
const hasChecked = ref(false)

const isImporting = ref(false)
const importFinished = ref(false)
const importProgress = reactive({
  current: 0,
  total: 0,
  success: 0,
  failed: 0,
})

const validRows = computed(() => rows.value.filter((r) => r.status === 'valid' || r.status === 'warning'))
const validCount = computed(() => validRows.value.length)
const errorCount = computed(() => rows.value.filter((r) => r.status === 'error').length)
const warningCount = computed(() => rows.value.filter((r) => r.status === 'warning').length)

const checkJson = () => {
  parseError.value = null
  importFinished.value = false
  hasChecked.value = true

  const result = parseAndValidateBooks(jsonText.value, books.value, categoryList.value)
  if (result.error) {
    parseError.value = result.error
    rows.value = []
  } else {
    rows.value = result.rows
  }
}

const runImport = async () => {
  const toImport = validRows.value
  if (!toImport.length || isImporting.value) return

  isImporting.value = true
  importFinished.value = false
  importProgress.current = 0
  importProgress.total = toImport.length
  importProgress.success = 0
  importProgress.failed = 0

  for (const r of toImport) {
    r.importStatus = 'pending'
    r.importError = undefined
  }

  for (let i = 0; i < toImport.length; i++) {
    const row = toImport[i]
    importProgress.current = i + 1
    try {
      await addBook(row.book)
      row.importStatus = 'success'
      importProgress.success++
    } catch (e) {
      row.importStatus = 'failed'
      row.importError = e instanceof Error ? e.message : 'Gagal menyimpan ke Firestore'
      importProgress.failed++
    }
  }

  isImporting.value = false
  importFinished.value = true

  // Jika semua baris valid berhasil diimpor, kosongkan textarea
  if (importProgress.failed === 0) {
    jsonText.value = ''
  }
}

const sampleJson = `[
  {
    "title": "Laskar Pelangi",
    "author": "Andrea Hirata",
    "isbn": "9789793062792",
    "code": "AGM-01",
    "category": "Fiksi",
    "purchaseDate": "2026-11-06",
    "synopsis": "Kisah tentang 10 anak di Belitung\\nyang berjuang untuk meraih mimpi.",
    "shelf": 1,
    "cube": 1,
    "coverUrl": ""
  }
]`

const fillSample = () => {
  const defaultCategory = categoryList.value[0]?.name || 'Fiksi'
  jsonText.value = `[
  {
    "title": "Laskar Pelangi",
    "author": "Andrea Hirata",
    "isbn": "9789793062792",
    "code": "AGM-01",
    "category": "${defaultCategory}",
    "purchaseDate": "2026-11-06",
    "synopsis": "Kisah tentang kehidupan 10 murid di desa Gantung, Belitung Timur.\\nMenampilkan persahabatan dan semangat belajar yang gigih.",
    "shelf": 1,
    "cube": 1,
    "coverUrl": ""
  }
]`
  checkJson()
}
</script>

<template>
  <section class="import-page">
    <NuxtLink to="/" class="back">← Kembali ke daftar</NuxtLink>

    <div class="intro">
      <h1>Import JSON</h1>
      <p class="lede">
        Salin dan tempel array objek buku dalam format JSON untuk dimasukkan ke Firestore sekaligus.
      </p>
    </div>

    <!-- Area Input JSON -->
    <div class="form-block import-input-card">
      <div class="form-block-head">
        <span class="step-badge" aria-hidden="true">1</span>
        <h2>Tempel Data JSON</h2>
      </div>

      <label class="field">
        <span class="field-label-row">
          <span>JSON Buku</span>
          <button type="button" class="link-sample" @click="fillSample">
            Isi contoh JSON
          </button>
        </span>
        <textarea
          v-model="jsonText"
          class="input textarea json-textarea"
          rows="8"
          placeholder="[&#10;  {&#10;    &quot;title&quot;: &quot;...&quot;,&#10;    &quot;author&quot;: &quot;...&quot;,&#10;    &quot;category&quot;: &quot;...&quot;,&#10;    &quot;purchaseDate&quot;: &quot;YYYY-MM-DD&quot;&#10;  }&#10;]"
          spellcheck="false"
        />
      </label>

      <div class="import-input-actions">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!jsonText.trim() || isImporting"
          @click="checkJson"
        >
          <IconsIconSearch :size="16" />
          <span>Periksa JSON</span>
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

    <!-- Pratinjau Hasil Pemeriksaan -->
    <div v-if="hasChecked && !parseError && rows.length" class="import-preview-section">
      <div class="preview-header">
        <div class="form-block-head">
          <span class="step-badge" aria-hidden="true">2</span>
          <h2>Pratinjau Impor</h2>
        </div>

        <div class="import-stats">
          <span class="stat-pill total">Total: {{ rows.length }}</span>
          <span class="stat-pill valid">Valid: {{ validCount }}</span>
          <span v-if="warningCount" class="stat-pill warn">Peringatan: {{ warningCount }}</span>
          <span v-if="errorCount" class="stat-pill error">Error: {{ errorCount }}</span>
        </div>
      </div>

      <!-- Tabel Pratinjau -->
      <div class="table-container">
        <table class="book-table import-table">
          <caption class="sr-only">Pratinjau data buku sebelum diimpor</caption>
          <thead>
            <tr>
              <th scope="col" class="col-no">No</th>
              <th scope="col" class="col-code">Kode</th>
              <th scope="col" class="col-title">Judul</th>
              <th scope="col" class="col-author">Pengarang</th>
              <th scope="col" class="col-category">Kategori</th>
              <th scope="col" class="col-date">Tgl Beli</th>
              <th scope="col" class="col-synopsis">Sinopsis</th>
              <th scope="col" class="col-status">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in rows"
              :key="r.index"
              :class="{
                'row-error': r.status === 'error',
                'row-warn': r.status === 'warning',
                'row-valid': r.status === 'valid',
              }"
            >
              <td class="col-no">{{ r.index }}</td>
              <td class="col-code">
                <span v-if="r.book.code">{{ r.book.code }}</span>
                <span v-else class="cell-empty">-</span>
              </td>
              <td class="col-title">
                <strong>{{ r.book.title || '(Judul kosong)' }}</strong>
                <div v-if="r.book.isbn" class="subtext">ISBN: {{ r.book.isbn }}</div>
                <div v-if="r.book.shelf && r.book.cube" class="subtext">
                  Rak {{ r.book.shelf }}, Kubus {{ r.book.cube }}
                </div>
              </td>
              <td class="col-author">
                <span v-if="r.book.author">{{ r.book.author }}</span>
                <span v-else class="cell-empty">-</span>
              </td>
              <td class="col-category">
                <span v-if="r.book.category" class="table-cat-badge">
                  {{ r.book.category }}
                </span>
                <span v-else class="cell-empty">-</span>
              </td>
              <td class="col-date">
                <span v-if="r.book.purchaseDate">{{ r.book.purchaseDate }}</span>
                <span v-else class="cell-empty">-</span>
              </td>
              <td class="col-synopsis" :title="r.book.synopsis || undefined">
                <span v-if="r.book.synopsis">
                  {{
                    r.book.synopsis.length > 60
                      ? r.book.synopsis.slice(0, 60) + '…'
                      : r.book.synopsis
                  }}
                </span>
                <span v-else class="cell-empty">-</span>
              </td>
              <td class="col-status">
                <div class="status-cell">
                  <!-- Status Badge -->
                  <span
                    class="status-badge"
                    :class="{
                      'badge-valid': r.status === 'valid',
                      'badge-warn': r.status === 'warning',
                      'badge-error': r.status === 'error',
                    }"
                  >
                    {{
                      r.status === 'valid'
                        ? 'Valid'
                        : r.status === 'warning'
                          ? 'Peringatan'
                          : 'Error (dilewati)'
                    }}
                  </span>

                  <!-- List Error Messages -->
                  <ul v-if="r.errors.length" class="status-messages error-list">
                    <li v-for="(err, ei) in r.errors" :key="ei">{{ err }}</li>
                  </ul>

                  <!-- List Warning Messages -->
                  <ul v-if="r.warnings.length" class="status-messages warn-list">
                    <li v-for="(warn, wi) in r.warnings" :key="wi">{{ warn }}</li>
                  </ul>

                  <!-- Real-time Import Progress / Result per Row -->
                  <div v-if="r.importStatus" class="import-cell-result">
                    <span v-if="r.importStatus === 'success'" class="tag-success">
                      ✓ Berhasil diimpor
                    </span>
                    <span v-else-if="r.importStatus === 'failed'" class="tag-failed">
                      ✗ Gagal: {{ r.importError }}
                    </span>
                    <span v-else-if="r.importStatus === 'pending'" class="tag-pending">
                      Menyimpan…
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Tombol Eksekusi Impor & Progress -->
      <div class="import-action-bar">
        <!-- Progress Bar saat Mengimpor -->
        <div v-if="isImporting" class="import-progress-box">
          <div class="progress-info">
            <span>Mengimpor {{ importProgress.current }} dari {{ importProgress.total }} buku…</span>
            <span>{{ Math.round((importProgress.current / importProgress.total) * 100) }}%</span>
          </div>
          <div class="progress-track">
            <div
              class="progress-fill"
              :style="{ width: `${(importProgress.current / importProgress.total) * 100}%` }"
            />
          </div>
        </div>

        <!-- Ringkasan Setelah Selesai -->
        <div v-if="importFinished" class="import-summary-box">
          <p v-if="importProgress.failed === 0" class="notice success" role="status">
            ✓ <strong>Berhasil mengimpor {{ importProgress.success }} buku ke koleksi!</strong>
            Semua data telah tersimpan di Firestore.
            <NuxtLink to="/" class="view-list-link">Lihat daftar buku →</NuxtLink>
          </p>
          <p v-else class="notice warn" role="alert">
            Selesai dengan catatan: <strong>{{ importProgress.success }} buku berhasil</strong>,
            <strong>{{ importProgress.failed }} buku gagal</strong>. Periksa pesan error pada tabel di atas.
          </p>
        </div>

        <button
          type="button"
          class="btn btn-primary btn-import"
          :disabled="validCount === 0 || isImporting || (importFinished && validCount === 0)"
          @click="runImport"
        >
          <IconsIconUpload :size="18" />
          <span>{{ isImporting ? 'Mengimpor…' : `Impor ${validCount} buku` }}</span>
        </button>
      </div>
    </div>
  </section>
</template>
