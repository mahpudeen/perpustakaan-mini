<script setup lang="ts">
import { formatRupiah } from '~/utils/rupiah'
import {
  sumPrices,
  countPriced,
  groupByYear,
  groupByCategory,
  groupByAnime,
  type SpendingYearRow,
  type SpendingGroupRow,
} from '~/utils/spending'

definePageMeta({ middleware: 'owner' })
useHead({ title: 'Dashboard Pengeluaran · Perpustakaan Mini' })

const { books, loaded: booksLoaded, error: booksError } = useBooks()
const { figures, loaded: figuresLoaded, error: figuresError } = useFigures()
const { categories: categoryList } = useCategories()

const loaded = computed(() => booksLoaded.value && figuresLoaded.value)
const error = computed(() => booksError.value || figuresError.value)

// ── Ringkasan Total ──
const totalBooks = computed(() => sumPrices(books.value))
const totalFigures = computed(() => sumPrices(figures.value))
const totalCombined = computed(() => totalBooks.value + totalFigures.value)

const pricedBooksCount = computed(() => countPriced(books.value))
const pricedFiguresCount = computed(() => countPriced(figures.value))
const totalPricedCount = computed(() => pricedBooksCount.value + pricedFiguresCount.value)

const unpricedBooksCount = computed(() => books.value.length - pricedBooksCount.value)
const unpricedFiguresCount = computed(() => figures.value.length - pricedFiguresCount.value)

const averagePrice = computed(() => {
  if (totalPricedCount.value <= 0) return 0
  return Math.round(totalCombined.value / totalPricedCount.value)
})

// ── Pengelompokan Data ──
const yearRows = computed<SpendingYearRow[]>(() => groupByYear(books.value, figures.value))

const maxYearTotal = computed(() => {
  if (!yearRows.value.length) return 1
  return Math.max(...yearRows.value.map((r) => r.total), 1)
})

const getCategoryName = (b: { category?: string; categoryId?: string }) => {
  if (b.category) return b.category
  if (b.categoryId) {
    const found = categoryList.value.find((c) => c.id === b.categoryId)
    if (found) return found.name
  }
  return ''
}

const categoryRows = computed<SpendingGroupRow[]>(() =>
  groupByCategory(books.value, getCategoryName),
)

const animeRows = computed<SpendingGroupRow[]>(() => groupByAnime(figures.value))
</script>

<template>
  <section class="spending-page">
    <div class="intro">
      <h1>Dashboard Pengeluaran</h1>
      <p class="lede">
        Ringkasan pengeluaran untuk koleksi buku dan action figure. Khusus pemilik.
      </p>
    </div>

    <!-- State Error -->
    <p v-if="error" class="notice warn" role="alert">
      Data belum bisa dimuat: {{ error }}
    </p>

    <!-- State Loading Skeleton -->
    <div v-else-if="!loaded" class="spending-skeleton" aria-busy="true" aria-label="Memuat dashboard pengeluaran…">
      <div class="spending-cards-grid">
        <div v-for="i in 3" :key="i" class="spending-card skeleton-card">
          <div class="skeleton-line short" />
          <div class="skeleton-line title" />
          <div class="skeleton-line" />
        </div>
      </div>
      <div class="table-container" style="margin-top: 2rem;">
        <div class="skeleton-line" style="height: 180px;" />
      </div>
    </div>

    <!-- State Belum Ada Harga -->
    <div v-else-if="totalPricedCount === 0" class="notice empty-state">
      <span class="empty-icon" aria-hidden="true">
        <IconsIconChart :size="48" />
      </span>
      <h2>Belum ada harga yang diisi</h2>
      <p>Isi harga lewat form ubah buku atau figure untuk melihat ringkasan pengeluaran.</p>
      <div class="empty-state-actions">
        <NuxtLink to="/" class="btn btn-primary">Lihat daftar buku</NuxtLink>
        <NuxtLink to="/figure" class="btn">Lihat daftar figure</NuxtLink>
      </div>
    </div>

    <!-- Konten Dashboard -->
    <template v-else>
      <!-- Bagian 1: Kartu Total -->
      <section class="spending-cards-grid" aria-label="Ringkasan total pengeluaran">
        <!-- Kartu 1: Total Gabungan -->
        <article class="spending-card card-hero">
          <div class="spending-card-head">
            <span class="spending-label">Total Pengeluaran</span>
            <span class="spending-pill pill-hero">Buku + Figure</span>
          </div>
          <div class="spending-value-hero font-tabular">
            {{ formatRupiah(totalCombined) }}
          </div>
          <p class="spending-subtext">
            Rata-rata {{ formatRupiah(averagePrice) }} per item berharga (dari {{ totalPricedCount }} item)
          </p>
        </article>

        <!-- Kartu 2: Buku -->
        <article class="spending-card">
          <div class="spending-card-head">
            <span class="spending-label">Buku</span>
            <span class="spending-pill pill-buku">Buku</span>
          </div>
          <div class="spending-value font-tabular">
            {{ formatRupiah(totalBooks) }}
          </div>
          <p class="spending-meta font-tabular">
            {{ pricedBooksCount }} buku berharga dari {{ books.length }} buku
          </p>
          <NuxtLink
            v-if="unpricedBooksCount > 0"
            to="/?harga=kosong"
            class="spending-unpriced-link"
          >
            {{ unpricedBooksCount }} belum ada harga →
          </NuxtLink>
        </article>

        <!-- Kartu 3: Figure -->
        <article class="spending-card">
          <div class="spending-card-head">
            <span class="spending-label">Action Figure</span>
            <span class="spending-pill pill-figure">Figure</span>
          </div>
          <div class="spending-value font-tabular">
            {{ formatRupiah(totalFigures) }}
          </div>
          <p class="spending-meta font-tabular">
            {{ pricedFiguresCount }} figure berharga dari {{ figures.length }} figure
          </p>
          <NuxtLink
            v-if="unpricedFiguresCount > 0"
            to="/figure?harga=kosong"
            class="spending-unpriced-link"
          >
            {{ unpricedFiguresCount }} belum ada harga →
          </NuxtLink>
        </article>
      </section>

      <!-- Bagian 2: Pengeluaran per Tahun Beli -->
      <section class="spending-section">
        <div class="spending-section-head">
          <h2>Pengeluaran per Tahun Beli</h2>
          <div class="chart-legend" aria-hidden="true">
            <span class="legend-item"><span class="legend-dot dot-buku" /> Buku</span>
            <span class="legend-item"><span class="legend-dot dot-figure" /> Action Figure</span>
          </div>
        </div>

        <!-- Stacked Bar Visualisasi (Dekoratif) -->
        <div v-if="yearRows.length" class="year-bars-container" aria-hidden="true">
          <div v-for="yr in yearRows" :key="yr.label" class="year-bar-row">
            <div class="year-bar-label font-tabular">{{ yr.label }}</div>
            <div class="year-bar-track">
              <div
                class="year-bar-total"
                :style="{ width: `${(yr.total / maxYearTotal) * 100}%` }"
              >
                <div
                  v-if="yr.buku > 0"
                  class="bar-segment seg-buku"
                  :style="{ width: `${(yr.buku / yr.total) * 100}%` }"
                  :title="`Buku: ${formatRupiah(yr.buku)}`"
                />
                <div
                  v-if="yr.figure > 0"
                  class="bar-segment seg-figure"
                  :style="{ width: `${(yr.figure / yr.total) * 100}%` }"
                  :title="`Figure: ${formatRupiah(yr.figure)}`"
                />
              </div>
            </div>
            <div class="year-bar-amount font-tabular">{{ formatRupiah(yr.total) }}</div>
          </div>
        </div>

        <!-- Tabel Tahun -->
        <div class="table-container">
          <table class="book-table spending-table">
            <caption class="sr-only">Rincian pengeluaran per tahun beli</caption>
            <thead>
              <tr>
                <th scope="col">Tahun</th>
                <th scope="col" class="text-right">Buku</th>
                <th scope="col" class="text-right">Action Figure</th>
                <th scope="col" class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="yr in yearRows" :key="yr.label">
                <td class="col-year font-tabular">
                  <strong>{{ yr.label }}</strong>
                </td>
                <td class="text-right font-tabular">
                  <span v-if="yr.buku > 0">
                    {{ formatRupiah(yr.buku) }}
                    <small class="sub-count">({{ yr.countBuku }} buku)</small>
                  </span>
                  <span v-else class="cell-empty">-</span>
                </td>
                <td class="text-right font-tabular">
                  <span v-if="yr.figure > 0">
                    {{ formatRupiah(yr.figure) }}
                    <small class="sub-count">({{ yr.countFigure }} figure)</small>
                  </span>
                  <span v-else class="cell-empty">-</span>
                </td>
                <td class="text-right font-tabular col-total-amount">
                  <strong>{{ formatRupiah(yr.total) }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Bagian 3: Pengeluaran Buku per Kategori -->
      <section class="spending-section">
        <div class="spending-section-head">
          <h2>Pengeluaran Buku per Kategori</h2>
        </div>

        <div v-if="categoryRows.length" class="table-container">
          <table class="book-table spending-table">
            <caption class="sr-only">Rincian pengeluaran buku per kategori</caption>
            <thead>
              <tr>
                <th scope="col">Kategori</th>
                <th scope="col" class="text-right">Buku Berharga</th>
                <th scope="col" class="text-right">Total Pengeluaran</th>
                <th scope="col" class="col-share">Porsi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in categoryRows" :key="c.label">
                <td class="col-category-name">
                  <strong>{{ c.label }}</strong>
                </td>
                <td class="text-right font-tabular">
                  {{ c.count }} buku
                </td>
                <td class="text-right font-tabular">
                  <strong>{{ formatRupiah(c.total) }}</strong>
                </td>
                <td class="col-share">
                  <div class="share-cell font-tabular">
                    <div class="share-bar-track" aria-hidden="true">
                      <div class="share-bar-fill fill-buku" :style="{ width: `${c.share}%` }" />
                    </div>
                    <span class="share-pct">{{ c.share }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="hint">Belum ada buku dengan harga.</p>
      </section>

      <!-- Bagian 4: Pengeluaran Figure per Anime -->
      <section class="spending-section">
        <div class="spending-section-head">
          <h2>Pengeluaran Action Figure per Seri Anime</h2>
        </div>

        <div v-if="animeRows.length" class="table-container">
          <table class="book-table spending-table">
            <caption class="sr-only">Rincian pengeluaran action figure per seri anime</caption>
            <thead>
              <tr>
                <th scope="col">Seri Anime</th>
                <th scope="col" class="text-right">Figure Berharga</th>
                <th scope="col" class="text-right">Total Pengeluaran</th>
                <th scope="col" class="col-share">Porsi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in animeRows" :key="a.label">
                <td class="col-anime-name">
                  <strong>{{ a.label }}</strong>
                </td>
                <td class="text-right font-tabular">
                  {{ a.count }} figure
                </td>
                <td class="text-right font-tabular">
                  <strong>{{ formatRupiah(a.total) }}</strong>
                </td>
                <td class="col-share">
                  <div class="share-cell font-tabular">
                    <div class="share-bar-track" aria-hidden="true">
                      <div class="share-bar-fill fill-figure" :style="{ width: `${a.share}%` }" />
                    </div>
                    <span class="share-pct">{{ a.share }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="hint">Belum ada action figure dengan harga.</p>
      </section>
    </template>
  </section>
</template>
