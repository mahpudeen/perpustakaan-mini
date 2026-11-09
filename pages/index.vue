<script setup lang="ts">
import {
  naturalCompare,
  formatTanggal,
  filterBooks,
  sortBooks,
  paginate,
  buildPageList,
  type SortColumn,
  type SortDirection,
  type ViewMode,
} from '~/utils/bookTable'
import { formatRupiah } from '~/utils/rupiah'
import { exportBooksToCsv } from '~/utils/exportCsv'
import type { Book } from '~/composables/useBooks'

useHead({ title: 'Perpustakaan Mini' })

const route = useRoute()
const router = useRouter()
const { books, loaded, error } = useBooks()
const { categories: categoryList } = useCategories()
const { isOwner } = useAuth()

// State query disimpan ke useState agar diingat saat kembali dari halaman detail buku
const listQueryState = useState<Record<string, any>>('book-list-query', () => ({}))
watch(
  () => route.query,
  (q) => {
    listQueryState.value = { ...q }
  },
  { immediate: true },
)

// Helper untuk mendapatkan nama kategori buku
const getCategoryName = (book: Book): string => {
  const catName = (book.category || '').trim()
  const catId = (book as unknown as { categoryId?: string }).categoryId
  if (catId) {
    const found = categoryList.value.find(
      (c) => c.id === catId || c.name.toLowerCase() === catId.toLowerCase(),
    )
    if (found) return found.name
  }
  if (catName) {
    const found = categoryList.value.find(
      (c) => c.id === catName || c.name.toLowerCase() === catName.toLowerCase(),
    )
    if (found) return found.name
    return catName
  }
  return ''
}

// Helper untuk mengecek apakah buku cocok dengan filter kategori (ID, Nama, atau __none)
const isBookInCategory = (book: Book, filter: string): boolean => {
  if (!filter) return true
  if (filter === '__none') {
    const catName = (book.category || '').trim()
    const catId = (book as unknown as { categoryId?: string }).categoryId
    return !catName && !catId
  }

  // Cari apakah filter merujuk ke suatu kategori di categoryList
  const target = categoryList.value.find(
    (c) => c.id === filter || c.name.toLowerCase() === filter.toLowerCase(),
  )

  const bCat = (book.category || '').trim()
  const bCatId = (book as unknown as { categoryId?: string }).categoryId
  const bResolvedName = getCategoryName(book).trim()

  if (target) {
    return (
      bCat === target.id ||
      bCat.toLowerCase() === target.name.toLowerCase() ||
      bCatId === target.id ||
      bResolvedName.toLowerCase() === target.name.toLowerCase()
    )
  }

  const filterLower = filter.toLowerCase()
  return (
    bCat === filter ||
    bCat.toLowerCase() === filterLower ||
    bCatId === filter ||
    bResolvedName.toLowerCase() === filterLower
  )
}

// ── State yang dibaca dari URL (Source of Truth) ──
const urlSearch = computed(() => {
  const val = route.query.q
  if (Array.isArray(val)) return val[0] || ''
  return typeof val === 'string' ? val : ''
})
const categoryFilter = computed(() => {
  const val = route.query.kategori
  if (Array.isArray(val)) return val[0] || ''
  return typeof val === 'string' ? val : ''
})

const selectedCategoryValue = computed(() => {
  if (!categoryFilter.value) return ''
  if (categoryFilter.value === '__none') return '__none'
  const match = categoryList.value.find(
    (c) =>
      c.id === categoryFilter.value ||
      c.name.toLowerCase() === categoryFilter.value.toLowerCase(),
  )
  return match ? match.id : categoryFilter.value
})

const sortColumn = computed<SortColumn>(() => {
  const col = route.query.urut as SortColumn
  return ['kode', 'judul', 'pengarang', 'kategori', 'tgl', 'harga'].includes(col) ? col : 'kode'
})
const sortDirection = computed<SortDirection>(() => (route.query.arah === 'desc' ? 'desc' : 'asc'))
const pageParam = computed(() => {
  const n = Number(route.query.hal)
  return Number.isInteger(n) && n > 0 ? n : 1
})
const perPageParam = computed(() => {
  const n = Number(route.query.per)
  return [10, 25, 50, 100].includes(n) ? n : 10
})
const viewMode = computed<ViewMode>(() => (route.query.tampil === 'kartu' ? 'kartu' : 'tabel'))

const priceFilter = computed<'isi' | 'kosong' | ''>(() => {
  const val = route.query.harga
  if (val === 'isi' || val === 'kosong') return val
  return ''
})

const onPriceChange = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value
  updateQuery({ harga: val || undefined, hal: 1 })
}

// Search input local state untuk debounce ke URL tetapi langsung reaktif di tabel
const searchInput = ref(urlSearch.value)
watch(urlSearch, (val) => {
  if (val !== searchInput.value) {
    searchInput.value = val
  }
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Menulis pembaruan query ke URL via router.replace
const updateQuery = (changes: Record<string, string | number | undefined | null>) => {
  const next: Record<string, any> = { ...route.query }
  for (const [k, v] of Object.entries(changes)) {
    if (v === undefined || v === null || v === '') {
      delete next[k]
    } else {
      next[k] = String(v)
    }
  }

  // Hilangkan dari URL bila bernilai bawaan sesuai spesifikasi Bagian 4.7
  if (!next.q) delete next.q
  if (!next.kategori) delete next.kategori
  if (!next.harga) delete next.harga
  if (next.urut === 'kode') delete next.urut
  if (next.arah === 'asc') delete next.arah
  if (next.hal === '1') delete next.hal
  if (next.per === '10') delete next.per
  if (next.tampil === 'tabel') delete next.tampil

  router.replace({ query: next })
}

const onSearchInput = (e: Event) => {
  const val = (e.target as HTMLInputElement).value
  searchInput.value = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    updateQuery({ q: val.trim() || undefined, hal: 1 })
  }, 250)
}

const clearSearch = () => {
  searchInput.value = ''
  if (debounceTimer) clearTimeout(debounceTimer)
  updateQuery({ q: undefined, hal: 1 })
}

const onCategoryChange = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value
  updateQuery({ kategori: val || undefined, hal: 1 })
}

const toggleSort = (col: SortColumn) => {
  if (sortColumn.value === col) {
    const nextDir = sortDirection.value === 'asc' ? 'desc' : 'asc'
    updateQuery({
      urut: col === 'kode' && nextDir === 'asc' ? undefined : col,
      arah: nextDir === 'asc' ? undefined : nextDir,
      hal: 1,
    })
  } else {
    updateQuery({
      urut: col === 'kode' ? undefined : col,
      arah: undefined,
      hal: 1,
    })
  }
}

const setViewMode = (mode: ViewMode) => {
  updateQuery({ tampil: mode === 'tabel' ? undefined : mode })
}

const setPerPage = (e: Event) => {
  const val = Number((e.target as HTMLSelectElement).value)
  updateQuery({ per: val === 10 ? undefined : val, hal: 1 })
}

const goToPage = (page: number) => {
  updateQuery({ hal: page === 1 ? undefined : page })
}

const resetFilters = () => {
  searchInput.value = ''
  if (debounceTimer) clearTimeout(debounceTimer)
  updateQuery({ q: undefined, kategori: undefined, harga: undefined, hal: 1 })
}

// ── Dropdown Kategori dengan Jumlah Buku dari Seluruh Koleksi ──
const categoryOptions = computed(() => {
  const countsByCat: Record<string, number> = {}
  let unassignedCount = 0

  for (const b of books.value) {
    const catName = (b.category || '').trim()
    const catId = (b as unknown as { categoryId?: string }).categoryId
    if (!catName && !catId) {
      unassignedCount++
      continue
    }

    const match = categoryList.value.find(
      (c) => c.id === catId || c.id === catName || c.name.toLowerCase() === catName.toLowerCase(),
    )
    if (match) {
      countsByCat[match.id] = (countsByCat[match.id] || 0) + 1
    } else {
      const key = catId || catName
      countsByCat[key] = (countsByCat[key] || 0) + 1
    }
  }

  // Kategori yang ada di categoryList dan punya buku, diurutkan abjad
  const items = categoryList.value
    .map((c) => ({
      id: c.id,
      name: c.name,
      count: countsByCat[c.id] || 0,
    }))
    .filter(
      (c) =>
        c.count > 0 ||
        c.id === selectedCategoryValue.value ||
        c.name.toLowerCase() === categoryFilter.value.toLowerCase(),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'id'))

  // Tambahkan jika ada buku dengan kategori teks yang belum terdaftar di categoryList
  for (const [key, count] of Object.entries(countsByCat)) {
    if (
      count > 0 &&
      !categoryList.value.some((c) => c.id === key || c.name.toLowerCase() === key.toLowerCase())
    ) {
      items.push({ id: key, name: key, count })
    }
  }

  return { items, unassignedCount }
})

// ── Filter, Sort, dan Pagination ──
const filteredBooks = computed(() =>
  filterBooks(
    books.value,
    searchInput.value,
    categoryFilter.value,
    getCategoryName,
    isBookInCategory,
    priceFilter.value,
  ),
)

const sortedBooks = computed(() =>
  sortBooks(filteredBooks.value, sortColumn.value, sortDirection.value, getCategoryName),
)

const paginationResult = computed(() =>
  paginate(sortedBooks.value, pageParam.value, perPageParam.value),
)

// Otomatis jepit ke halaman terakhir jika halaman aktif melebihi total
watch(
  () => paginationResult.value.totalPages,
  (totalPages) => {
    if (pageParam.value > totalPages && totalPages > 0) {
      updateQuery({ hal: totalPages === 1 ? undefined : totalPages })
    }
  },
)

const pageList = computed(() =>
  buildPageList(paginationResult.value.currentPage, paginationResult.value.totalPages),
)

const onExportCsv = () => {
  exportBooksToCsv(books.value, getCategoryName)
}
</script>

<template>
  <section>
    <div class="intro">
      <h1>Perpustakaan Mini</h1>
      <p v-if="loaded && !error" class="lede">
        {{ books.length }} buku di rak. Cari kode, judul, atau pengarang.
      </p>
    </div>

    <!-- Toolbar: Pencarian, Filter Kategori, Ganti Tampilan -->
    <div class="table-toolbar">
      <div class="toolbar-filters">
        <!-- Input Pencarian -->
        <div class="search-box">
          <span class="search-icon" aria-hidden="true">
            <IconsIconSearch :size="18" />
          </span>
          <input
            :value="searchInput"
            type="search"
            class="input"
            placeholder="Cari kode, judul, atau pengarang…"
            aria-label="Cari buku"
            @input="onSearchInput"
          />
          <button
            v-if="searchInput"
            type="button"
            class="search-clear-btn"
            aria-label="Hapus kata pencarian"
            @click="clearSearch"
          >
            <IconsIconClose :size="16" />
          </button>
        </div>

        <!-- Filter Kategori Dropdown -->
        <select
          :value="selectedCategoryValue"
          class="input select-category"
          aria-label="Filter kategori"
          @change="onCategoryChange"
        >
          <option value="">Semua kategori</option>
          <option v-for="c in categoryOptions.items" :key="c.id" :value="c.id">
            {{ c.name }} ({{ c.count }})
          </option>
          <option
            v-if="categoryOptions.unassignedCount > 0 || selectedCategoryValue === '__none'"
            value="__none"
          >
            Tanpa kategori ({{ categoryOptions.unassignedCount }})
          </option>
        </select>
      </div>

      <!-- Toolbar Actions: Import JSON, Ekspor CSV & View Toggle -->
      <div class="toolbar-actions">
        <NuxtLink
          v-if="isOwner"
          to="/buku/import"
          class="btn-csv-export"
          title="Import buku dari format JSON"
        >
          <IconsIconUpload :size="16" />
          <span>Import JSON</span>
        </NuxtLink>
        <button
          type="button"
          class="btn-csv-export"
          :disabled="!books.length"
          title="Unduh data seluruh buku ke file CSV"
          aria-label="Unduh data buku ke CSV"
          @click="onExportCsv"
        >
          <IconsIconDownload :size="16" />
          <span>Ekspor CSV</span>
        </button>

        <!-- Segmented Button: Tabel | Kartu -->
        <div class="view-toggle" role="group" aria-label="Pilihan tampilan daftar buku">
          <button
            type="button"
            class="view-toggle-btn"
            :aria-pressed="viewMode === 'tabel'"
            @click="setViewMode('tabel')"
          >
            <IconsIconTable :size="16" />
            <span>Tabel</span>
          </button>
          <button
            type="button"
            class="view-toggle-btn"
            :aria-pressed="viewMode === 'kartu'"
            @click="setViewMode('kartu')"
          >
            <IconsIconGrid :size="16" />
            <span>Kartu</span>
          </button>
        </div>
      </div>
    </div>

    <!-- State Error -->
    <p v-if="error" class="notice warn" role="alert">
      Data belum bisa dimuat. Periksa konfigurasi Firebase dan aturan Firestore.
    </p>

    <!-- State Skeleton Loading -->
    <template v-else-if="!loaded">
      <div v-if="viewMode === 'tabel'" class="table-container" aria-busy="true" aria-label="Memuat buku…">
        <table class="book-table">
          <caption class="sr-only">Daftar buku sedang dimuat</caption>
          <thead>
            <tr>
              <th scope="col" class="col-no">No</th>
              <th scope="col" class="col-code">Kode</th>
              <th scope="col" class="col-title">Judul</th>
              <th scope="col" class="col-author">Pengarang</th>
              <th scope="col" class="col-category">Kategori</th>
              <th scope="col" class="col-date">Tgl Beli</th>
              <th scope="col" class="col-price text-right">Harga</th>
              <th scope="col" class="col-actions">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in 5" :key="i" class="skeleton-row">
              <td class="col-no"><div class="skeleton-bar short" /></td>
              <td class="col-code"><div class="skeleton-bar code" /></td>
              <td class="col-title"><div class="skeleton-bar title" /></td>
              <td class="col-author"><div class="skeleton-bar author" /></td>
              <td class="col-category"><div class="skeleton-bar badge" /></td>
              <td class="col-date"><div class="skeleton-bar date" /></td>
              <td class="col-price text-right"><div class="skeleton-bar short" /></td>
              <td class="col-actions"><div class="skeleton-bar actions" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="skeleton-grid" aria-busy="true" aria-label="Memuat buku…">
        <div v-for="i in 8" :key="i" class="skeleton-card">
          <div class="skeleton-cover" />
          <div class="skeleton-line" />
          <div class="skeleton-line short" />
          <div class="skeleton-line pill" />
        </div>
      </div>
    </template>

    <!-- State Koleksi Kosong -->
    <div v-else-if="!books.length" class="notice empty-state">
      <span class="empty-icon" aria-hidden="true">
        <IconsIconBook :size="48" />
      </span>
      <p>Belum ada buku. Masuk sebagai pemilik, lalu pilih Tambah buku.</p>
    </div>

    <!-- State Hasil Filter/Pencarian Kosong -->
    <div v-else-if="!paginationResult.totalItems" class="notice empty-state">
      <span class="empty-icon" aria-hidden="true">
        <IconsIconSearch :size="48" />
      </span>
      <p>Tidak ada buku yang cocok dengan pencarian ini.</p>
      <button type="button" class="btn btn-reset" @click="resetFilters">
        Reset pencarian & filter
      </button>
    </div>

    <!-- Konten Buku (Tabel atau Kartu) -->
    <template v-else>
      <!-- Mode Tabel -->
      <div v-if="viewMode === 'tabel'" class="table-container">
        <table class="book-table">
          <caption class="sr-only">Daftar buku</caption>
          <thead>
            <tr>
              <th scope="col" class="col-no">No</th>
              <th
                scope="col"
                class="col-code th-sortable"
                :aria-sort="sortColumn === 'kode' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"
              >
                <button type="button" class="th-sort-btn" @click="toggleSort('kode')">
                  <span>Kode</span>
                  <IconsIconSort
                    :direction="sortColumn === 'kode' ? sortDirection : 'none'"
                    :size="14"
                  />
                </button>
              </th>
              <th
                scope="col"
                class="col-title th-sortable"
                :aria-sort="sortColumn === 'judul' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"
              >
                <button type="button" class="th-sort-btn" @click="toggleSort('judul')">
                  <span>Judul</span>
                  <IconsIconSort
                    :direction="sortColumn === 'judul' ? sortDirection : 'none'"
                    :size="14"
                  />
                </button>
              </th>
              <th
                scope="col"
                class="col-author th-sortable"
                :aria-sort="sortColumn === 'pengarang' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"
              >
                <button type="button" class="th-sort-btn" @click="toggleSort('pengarang')">
                  <span>Pengarang</span>
                  <IconsIconSort
                    :direction="sortColumn === 'pengarang' ? sortDirection : 'none'"
                    :size="14"
                  />
                </button>
              </th>
              <th
                scope="col"
                class="col-category th-sortable"
                :aria-sort="sortColumn === 'kategori' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"
              >
                <button type="button" class="th-sort-btn" @click="toggleSort('kategori')">
                  <span>Kategori</span>
                  <IconsIconSort
                    :direction="sortColumn === 'kategori' ? sortDirection : 'none'"
                    :size="14"
                  />
                </button>
              </th>
              <th
                scope="col"
                class="col-date th-sortable"
                :aria-sort="sortColumn === 'tgl' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"
              >
                <button type="button" class="th-sort-btn" @click="toggleSort('tgl')">
                  <span>Tgl Beli</span>
                  <IconsIconSort
                    :direction="sortColumn === 'tgl' ? sortDirection : 'none'"
                    :size="14"
                  />
                </button>
              </th>
              <th
                scope="col"
                class="col-price th-sortable text-right"
                :aria-sort="sortColumn === 'harga' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"
              >
                <button type="button" class="th-sort-btn text-right" @click="toggleSort('harga')">
                  <span>Harga</span>
                  <IconsIconSort
                    :direction="sortColumn === 'harga' ? sortDirection : 'none'"
                    :size="14"
                  />
                </button>
              </th>
              <th scope="col" class="col-actions">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, idx) in paginationResult.items" :key="b.id">
              <td class="col-no">
                {{ (paginationResult.currentPage - 1) * perPageParam + idx + 1 }}
              </td>
              <td class="col-code">
                <span v-if="b.code">{{ b.code }}</span>
                <span v-else class="cell-empty">-</span>
              </td>
              <td class="col-title">
                <NuxtLink :to="`/buku/${b.id}`" class="table-book-link">
                  {{ b.title }}
                </NuxtLink>
              </td>
              <td class="col-author">
                <span v-if="b.author">{{ b.author }}</span>
                <span v-else class="cell-empty">-</span>
              </td>
              <td class="col-category">
                <span v-if="getCategoryName(b)" class="table-cat-badge">
                  {{ getCategoryName(b) }}
                </span>
                <span v-else class="cell-empty">-</span>
              </td>
              <td class="col-date">
                <span v-if="b.purchaseDate">{{ formatTanggal(b.purchaseDate) }}</span>
                <span v-else class="cell-empty">-</span>
              </td>
              <td class="col-price text-right font-tabular">
                <span v-if="b.price != null">{{ formatRupiah(b.price) }}</span>
                <span v-else class="cell-empty">-</span>
              </td>
              <td class="col-actions">
                <div class="actions-wrap">
                  <NuxtLink
                    :to="`/buku/${b.id}`"
                    class="action-icon-btn"
                    :aria-label="`Lihat detail ${b.title}`"
                    :title="`Lihat detail ${b.title}`"
                  >
                    <IconsIconEye :size="18" />
                  </NuxtLink>
                  <NuxtLink
                    v-if="isOwner"
                    :to="{ path: `/buku/${b.id}`, query: { ubah: '1' } }"
                    class="action-icon-btn edit-btn"
                    :aria-label="`Ubah ${b.title}`"
                    :title="`Ubah ${b.title}`"
                  >
                    <IconsIconEdit :size="18" />
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mode Kartu -->
      <div v-else class="grid">
        <BookCard v-for="b in paginationResult.items" :key="b.id" :book="b" />
      </div>

      <!-- Baris Bawah: Ringkasan, Pagination, Baris per Halaman -->
      <div class="table-footer">
        <!-- Teks Ringkasan -->
        <div class="table-summary" aria-live="polite">
          <template v-if="paginationResult.totalItems">
            Menampilkan {{ paginationResult.startIndex + 1 }}-{{ paginationResult.endIndex }} dari
            {{ paginationResult.totalItems }} buku
          </template>
          <template v-else>0 buku</template>
        </div>

        <!-- Navigasi Halaman (Hanya tampil bila totalPages > 1) -->
        <nav
          v-if="paginationResult.totalPages > 1"
          class="pagination-nav"
          aria-label="Halaman"
        >
          <button
            type="button"
            class="page-btn"
            :disabled="paginationResult.currentPage <= 1"
            aria-label="Halaman sebelumnya"
            @click="goToPage(paginationResult.currentPage - 1)"
          >
            <IconsIconChevronLeft :size="16" />
            <span>Sebelumnya</span>
          </button>

          <template v-for="(p, i) in pageList" :key="i">
            <span v-if="p === '…'" class="page-ellipsis" aria-hidden="true">…</span>
            <button
              v-else
              type="button"
              class="page-btn"
              :aria-current="p === paginationResult.currentPage ? 'page' : undefined"
              @click="goToPage(p)"
            >
              {{ p }}
            </button>
          </template>

          <button
            type="button"
            class="page-btn"
            :disabled="paginationResult.currentPage >= paginationResult.totalPages"
            aria-label="Halaman berikutnya"
            @click="goToPage(paginationResult.currentPage + 1)"
          >
            <span>Berikutnya</span>
            <IconsIconChevronRight :size="16" />
          </button>
        </nav>

        <!-- Pilihan Baris per Halaman -->
        <div class="per-page-control">
          <label for="per-page-select">Baris per halaman:</label>
          <select
            id="per-page-select"
            :value="perPageParam"
            class="per-page-select"
            @change="setPerPage"
          >
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>
      </div>
    </template>
  </section>
</template>
