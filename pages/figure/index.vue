<script setup lang="ts">
import {
  filterFigures,
  sortFigures,
  type FigureSortColumn,
} from '~/utils/figureTable'
import {
  paginate,
  buildPageList,
  formatTanggal,
  type SortDirection,
} from '~/utils/bookTable'
import { sizeLabel, uniqueAnime } from '~/utils/figure'
import { formatRupiah } from '~/utils/rupiah'

useHead({ title: 'Koleksi Action Figure · Perpustakaan Mini' })

const route = useRoute()
const router = useRouter()
const { figures, loaded, error } = useFigures()
const { isOwner } = useAuth()

// State query disimpan ke useState agar diingat saat kembali dari halaman detail figure
const listQueryState = useState<Record<string, any>>('figure-list-query', () => ({}))
watch(
  () => route.query,
  (q) => {
    listQueryState.value = { ...q }
  },
  { immediate: true },
)

// ── State dari URL (Source of Truth) ──
const urlSearch = computed(() => {
  const val = route.query.q
  if (Array.isArray(val)) return val[0] || ''
  return typeof val === 'string' ? val : ''
})

const animeFilter = computed(() => {
  const val = route.query.anime
  if (Array.isArray(val)) return val[0] || ''
  return typeof val === 'string' ? val : ''
})

const sizeFilter = computed(() => {
  const val = route.query.size
  if (Array.isArray(val)) return val[0] || ''
  return typeof val === 'string' ? val : ''
})

const sortColumn = computed<FigureSortColumn>(() => {
  const col = route.query.urut as FigureSortColumn
  return ['nama', 'anime', 'size', 'tgl', 'letak', 'harga'].includes(col) ? col : 'nama'
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

type ViewMode = 'kartu' | 'tabel'
const viewMode = computed<ViewMode>(() => (route.query.tampil === 'tabel' ? 'tabel' : 'kartu'))

const setViewMode = (mode: ViewMode) => {
  updateQuery({ tampil: mode === 'kartu' ? undefined : mode })
}

const priceFilter = computed<'isi' | 'kosong' | ''>(() => {
  const val = route.query.harga
  if (val === 'isi' || val === 'kosong') return val
  return ''
})

const onPriceChange = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value
  updateQuery({ harga: val || undefined, hal: 1 })
}

// Search input local state untuk debounce ke URL
const searchInput = ref(urlSearch.value)
watch(urlSearch, (val) => {
  if (val !== searchInput.value) {
    searchInput.value = val
  }
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const updateQuery = (changes: Record<string, string | number | undefined | null>) => {
  const next: Record<string, any> = { ...route.query }
  for (const [k, v] of Object.entries(changes)) {
    if (v === undefined || v === null || v === '') {
      delete next[k]
    } else {
      next[k] = String(v)
    }
  }

  // Hilangkan bawaan dari URL
  if (!next.q) delete next.q
  if (!next.anime) delete next.anime
  if (!next.size) delete next.size
  if (!next.harga) delete next.harga
  if (next.urut === 'nama') delete next.urut
  if (next.arah === 'asc') delete next.arah
  if (next.hal === '1') delete next.hal
  if (next.per === '10') delete next.per
  if (next.tampil === 'kartu') delete next.tampil

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

const onAnimeChange = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value
  updateQuery({ anime: val || undefined, hal: 1 })
}

const onSizeChange = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value
  updateQuery({ size: val || undefined, hal: 1 })
}

const toggleSort = (col: FigureSortColumn) => {
  if (sortColumn.value === col) {
    const nextDir = sortDirection.value === 'asc' ? 'desc' : 'asc'
    updateQuery({
      urut: col === 'nama' && nextDir === 'asc' ? undefined : col,
      arah: nextDir === 'asc' ? undefined : nextDir,
      hal: 1,
    })
  } else {
    updateQuery({
      urut: col === 'nama' ? undefined : col,
      arah: undefined,
      hal: 1,
    })
  }
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
  updateQuery({ q: undefined, anime: undefined, size: undefined, harga: undefined, hal: 1 })
}

// ── Dropdown Anime dengan Jumlah Figure ──
const animeOptions = computed(() => {
  const list = uniqueAnime(figures.value)
  const counts: Record<string, number> = {}
  let unassignedCount = 0

  for (const f of figures.value) {
    const a = (f.anime || '').trim()
    if (!a) {
      unassignedCount++
    } else {
      const match = list.find((item) => item.toLowerCase() === a.toLowerCase()) || a
      counts[match] = (counts[match] || 0) + 1
    }
  }

  const items = list.map((name) => ({
    name,
    count: counts[name] || 0,
  }))

  return { items, unassignedCount }
})

// ── Filter, Sort, dan Pagination ──
const filteredFigures = computed(() =>
  filterFigures(figures.value, searchInput.value, animeFilter.value, sizeFilter.value, priceFilter.value),
)

const sortedFigures = computed(() =>
  sortFigures(filteredFigures.value, sortColumn.value, sortDirection.value),
)

const paginationResult = computed(() =>
  paginate(sortedFigures.value, pageParam.value, perPageParam.value),
)

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
</script>

<template>
  <section class="figures-page">
    <div class="intro">
      <h1>Koleksi Action Figure</h1>
      <p v-if="loaded && !error" class="lede">
        {{ figures.length }} figure dalam koleksi. Cari nama atau seri anime.
      </p>
    </div>

    <!-- Toolbar: Pencarian, Filter Anime & Size, Tombol Pemilik & View Toggle -->
    <div class="table-toolbar figure-toolbar">
      <div class="toolbar-filters figure-toolbar-filters">
        <!-- Input Pencarian -->
        <div class="search-box">
          <span class="search-icon" aria-hidden="true">
            <IconsIconSearch :size="18" />
          </span>
          <input
            :value="searchInput"
            type="search"
            class="input"
            placeholder="Cari nama atau anime…"
            aria-label="Cari action figure"
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

        <div class="filter-selects">
          <!-- Filter Anime Dropdown -->
          <select
            :value="animeFilter"
            class="input select-category"
            aria-label="Filter anime"
            @change="onAnimeChange"
          >
            <option value="">Semua anime</option>
            <option v-for="a in animeOptions.items" :key="a.name" :value="a.name">
              {{ a.name }} ({{ a.count }})
            </option>
            <option
              v-if="animeOptions.unassignedCount > 0 || animeFilter === '__none'"
              value="__none"
            >
              Tanpa anime ({{ animeOptions.unassignedCount }})
            </option>
          </select>

          <!-- Filter Size Dropdown -->
          <select
            :value="sizeFilter"
            class="input select-size"
            aria-label="Filter ukuran"
            @change="onSizeChange"
          >
            <option value="">Semua ukuran</option>
            <option value="besar">Besar</option>
            <option value="medium">Medium</option>
            <option value="kecil">Kecil</option>
          </select>

          <!-- Filter Harga Dropdown -->
          <select
            :value="priceFilter"
            class="input select-price"
            aria-label="Filter harga"
            @change="onPriceChange"
          >
            <option value="">Harga: Semua</option>
            <option value="isi">Sudah diisi</option>
            <option value="kosong">Belum diisi</option>
          </select>
        </div>
      </div>

      <!-- Tombol Aksi Pemilik & View Toggle -->
      <div class="toolbar-actions">
        <template v-if="isOwner">
          <NuxtLink to="/figure/tambah" class="btn-csv-export" title="Tambah figure baru">
            <IconsIconPlus :size="16" />
            <span>Tambah figure</span>
          </NuxtLink>
          <NuxtLink to="/figure/impor" class="btn-csv-export" title="Impor figure dari JSON">
            <IconsIconUpload :size="16" />
            <span>Impor JSON</span>
          </NuxtLink>
        </template>
      </div>

      <!-- Segmented Button: Kartu | Tabel -->
      <div class="view-toggle" role="group" aria-label="Pilihan tampilan koleksi figure">
        <button
          type="button"
          class="view-toggle-btn"
          :aria-pressed="viewMode === 'kartu'"
          @click="setViewMode('kartu')"
        >
          <IconsIconGrid :size="16" />
          <span>Kartu</span>
        </button>
        <button
          type="button"
          class="view-toggle-btn"
          :aria-pressed="viewMode === 'tabel'"
          @click="setViewMode('tabel')"
        >
          <IconsIconTable :size="16" />
          <span>Tabel</span>
        </button>
      </div>
    </div>

    <!-- State Error -->
    <p v-if="error" class="notice warn" role="alert">
      Data figure belum bisa dimuat. Periksa konfigurasi Firestore.
    </p>

    <!-- State Skeleton Loading -->
    <template v-else-if="!loaded">
      <div v-if="viewMode === 'tabel'" class="table-container" aria-busy="true" aria-label="Memuat figure…">
        <table class="book-table">
          <caption class="sr-only">Daftar figure sedang dimuat</caption>
          <thead>
            <tr>
              <th scope="col" class="col-no">No</th>
              <th scope="col" class="col-title">Nama</th>
              <th scope="col">Anime</th>
              <th scope="col">Ukuran</th>
              <th scope="col">Tgl Beli</th>
              <th scope="col" class="col-price text-right">Harga</th>
              <th scope="col">Letak</th>
              <th scope="col" class="col-actions">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in 5" :key="i" class="skeleton-row">
              <td class="col-no"><div class="skeleton-bar short" /></td>
              <td class="col-title"><div class="skeleton-bar title" /></td>
              <td><div class="skeleton-bar badge" /></td>
              <td><div class="skeleton-bar short" /></td>
              <td><div class="skeleton-bar date" /></td>
              <td class="col-price text-right"><div class="skeleton-bar short" /></td>
              <td><div class="skeleton-bar date" /></td>
              <td class="col-actions"><div class="skeleton-bar actions" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="skeleton-grid" aria-busy="true" aria-label="Memuat figure…">
        <div v-for="i in 8" :key="i" class="skeleton-card">
          <div class="skeleton-cover figure-skeleton-cover" />
          <div class="skeleton-line" />
          <div class="skeleton-line short" />
          <div class="skeleton-line pill" />
        </div>
      </div>
    </template>

    <!-- State Koleksi Kosong -->
    <div v-else-if="!figures.length" class="notice empty-state">
      <span class="empty-icon" aria-hidden="true">
        <IconsIconFigure :size="48" />
      </span>
      <p>Belum ada action figure dalam koleksi.</p>
      <NuxtLink v-if="isOwner" to="/figure/tambah" class="btn btn-primary">
        Tambah figure pertama
      </NuxtLink>
    </div>

    <!-- State Filter Kosong -->
    <div v-else-if="!paginationResult.totalItems" class="notice empty-state">
      <span class="empty-icon" aria-hidden="true">
        <IconsIconSearch :size="48" />
      </span>
      <p>Tidak ada figure yang cocok dengan pencarian ini.</p>
      <button type="button" class="btn btn-reset" @click="resetFilters">
        Reset pencarian & filter
      </button>
    </div>

    <!-- Konten Figure (Kartu atau Tabel) -->
    <template v-else>
      <!-- Mode Kartu (Default) -->
      <div v-if="viewMode === 'kartu'" class="grid">
        <FigureCard v-for="f in paginationResult.items" :key="f.id" :figure="f" />
      </div>

      <!-- Mode Tabel -->
      <div v-else class="table-container">
        <table class="book-table figure-table">
          <caption class="sr-only">Daftar action figure</caption>
          <thead>
            <tr>
              <th scope="col" class="col-no">No</th>
              <th
                scope="col"
                class="col-title th-sortable"
                :aria-sort="sortColumn === 'nama' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"
              >
                <button type="button" class="th-sort-btn" @click="toggleSort('nama')">
                  <span>Nama</span>
                  <IconsIconSort
                    :direction="sortColumn === 'nama' ? sortDirection : 'none'"
                    :size="14"
                  />
                </button>
              </th>
              <th
                scope="col"
                class="th-sortable"
                :aria-sort="sortColumn === 'anime' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"
              >
                <button type="button" class="th-sort-btn" @click="toggleSort('anime')">
                  <span>Anime</span>
                  <IconsIconSort
                    :direction="sortColumn === 'anime' ? sortDirection : 'none'"
                    :size="14"
                  />
                </button>
              </th>
              <th
                scope="col"
                class="th-sortable"
                :aria-sort="sortColumn === 'size' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"
              >
                <button type="button" class="th-sort-btn" @click="toggleSort('size')">
                  <span>Ukuran</span>
                  <IconsIconSort
                    :direction="sortColumn === 'size' ? sortDirection : 'none'"
                    :size="14"
                  />
                </button>
              </th>
              <th
                scope="col"
                class="th-sortable"
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
              <th
                scope="col"
                class="th-sortable"
                :aria-sort="sortColumn === 'letak' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"
              >
                <button type="button" class="th-sort-btn" @click="toggleSort('letak')">
                  <span>Letak</span>
                  <IconsIconSort
                    :direction="sortColumn === 'letak' ? sortDirection : 'none'"
                    :size="14"
                  />
                </button>
              </th>
              <th scope="col" class="col-actions">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(f, idx) in paginationResult.items" :key="f.id">
              <td class="col-no">
                {{ (paginationResult.currentPage - 1) * perPageParam + idx + 1 }}
              </td>
              <td class="col-title">
                <div class="figure-row-name">
                  <div class="figure-thumb">
                    <img
                      v-if="f.photoData"
                      :src="f.photoData"
                      :alt="f.name"
                      class="figure-thumb-img"
                    />
                    <div v-else class="figure-thumb-icon">
                      <IconsIconFigure :size="20" />
                    </div>
                  </div>
                  <NuxtLink :to="`/figure/${f.id}`" class="table-book-link">
                    {{ f.name }}
                  </NuxtLink>
                </div>
              </td>
              <td>
                <NuxtLink
                  v-if="f.anime"
                  :to="{ path: '/figure', query: { anime: f.anime } }"
                  class="table-cat-badge anime-badge"
                >
                  {{ f.anime }}
                </NuxtLink>
                <span v-else class="cell-empty">-</span>
              </td>
              <td>
                <span class="badge-size" :class="`size-${f.size}`">
                  {{ sizeLabel(f.size) }}
                </span>
              </td>
              <td>
                <span v-if="f.purchaseDate">{{ formatTanggal(f.purchaseDate) }}</span>
                <span v-else class="cell-empty">-</span>
              </td>
              <td class="col-price text-right font-tabular">
                <span v-if="f.price != null">{{ formatRupiah(f.price) }}</span>
                <span v-else class="cell-empty">-</span>
              </td>
              <td>
                <NuxtLink v-if="f.shelf && f.cube" to="/rak" class="table-loc-link">
                  Rak {{ f.shelf }}, kubus {{ f.cube }}
                </NuxtLink>
                <span v-else class="cell-empty">-</span>
              </td>
              <td class="col-actions">
                <div class="actions-wrap">
                  <NuxtLink
                    :to="`/figure/${f.id}`"
                    class="action-icon-btn"
                    :aria-label="`Lihat detail ${f.name}`"
                    :title="`Lihat detail ${f.name}`"
                  >
                    <IconsIconEye :size="18" />
                  </NuxtLink>
                  <NuxtLink
                    v-if="isOwner"
                    :to="{ path: `/figure/${f.id}`, query: { ubah: '1' } }"
                    class="action-icon-btn edit-btn"
                    :aria-label="`Ubah ${f.name}`"
                    :title="`Ubah ${f.name}`"
                  >
                    <IconsIconEdit :size="18" />
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer: Ringkasan, Pagination & Per Page -->
      <div class="table-footer">
        <div class="table-summary" aria-live="polite">
          <template v-if="paginationResult.totalItems">
            Menampilkan {{ paginationResult.startIndex + 1 }}-{{ paginationResult.endIndex }} dari
            {{ paginationResult.totalItems }} figure
          </template>
          <template v-else>0 figure</template>
        </div>

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

        <div class="per-page-control">
          <label for="per-page-figures">Baris per halaman:</label>
          <select
            id="per-page-figures"
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
