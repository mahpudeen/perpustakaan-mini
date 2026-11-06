<script setup lang="ts">
import { CUBE_COUNT, CUBE_COLS, SHELF_COUNT, type Book } from '~/composables/useBooks'
import { useFigures, type Figure } from '~/composables/useFigures'
import { layoutCube, sizeLabel } from '~/utils/figure'

useHead({ title: 'Rak · Perpustakaan Mini' })
const { books, loaded: booksLoaded, error: booksError } = useBooks()
const { figures: figureList, loaded: figuresLoaded, error: figuresError } = useFigures()
const { isOwner } = useAuth()

const loaded = computed(() => booksLoaded.value && figuresLoaded.value)
const error = computed(() => booksError.value || figuresError.value)

const selected = ref<{ shelf: number; cube: number } | null>(null)

const inCube = (shelf: number, cube: number): Book[] =>
  books.value.filter((b) => b.shelf === shelf && b.cube === cube)

const inCubeFigures = (shelf: number, cube: number): Figure[] =>
  figureList.value.filter((f) => f.shelf === shelf && f.cube === cube)

const figuresLayout = (shelf: number, cube: number) =>
  layoutCube(inCubeFigures(shelf, cube))

// Kategori kubus diambil dari buku di dalamnya. Kubus kosong tidak punya nama kategori.
const cubeCategory = (list: Book[]) => list.find((b) => b.category)?.category ?? ''

const selectedBooks = computed(() =>
  selected.value ? inCube(selected.value.shelf, selected.value.cube) : [],
)
const selectedFigures = computed(() =>
  selected.value ? inCubeFigures(selected.value.shelf, selected.value.cube) : [],
)

const unplaced = computed(() => books.value.filter((b) => !b.shelf || !b.cube))
const unplacedFigures = computed(() => figureList.value.filter((f) => !f.shelf || !f.cube))

const pick = (shelf: number, cube: number) => {
  const same = selected.value?.shelf === shelf && selected.value?.cube === cube
  selected.value = same ? null : { shelf, cube }
}
</script>

<template>
  <section>
    <div class="intro">
      <h1>Rak</h1>
      <p class="lede">Pilih kubus untuk melihat buku dan action figure di dalamnya.</p>
    </div>

    <p v-if="error" class="notice warn">Data belum bisa dimuat. Periksa konfigurasi Firebase.</p>
    <p v-else-if="!loaded" class="notice">Memuat rak…</p>

    <template v-else>
      <div class="shelves">
        <div v-for="s in SHELF_COUNT" :key="s" class="shelf-wrap">
          <h2 class="shelf-title">Rak {{ s }}</h2>
          <div class="shelf" :style="{ gridTemplateColumns: `repeat(${CUBE_COLS}, 1fr)` }">
            <button
              v-for="n in CUBE_COUNT"
              :key="n"
              type="button"
              class="cube"
              :class="{ active: selected?.shelf === s && selected?.cube === n }"
              :aria-pressed="selected?.shelf === s && selected?.cube === n"
              :aria-label="`Rak ${s}, kubus ${n}, ${inCube(s, n).length} buku${inCubeFigures(s, n).length ? `, ${inCubeFigures(s, n).length} figure` : ''}`"
              @click="pick(s, n)"
            >
              <span class="cube-num">{{ n }}</span>
              <span class="cube-label">
                <!-- Kubus ada buku -->
                <template v-if="inCube(s, n).length">
                  <strong>{{ cubeCategory(inCube(s, n)) || 'Tanpa kategori' }}</strong>
                  <small>{{ inCube(s, n).length }} buku</small>
                  <small v-if="inCubeFigures(s, n).length" class="cube-fig-sub">
                    {{ inCubeFigures(s, n).length }} figure
                  </small>
                </template>
                <!-- Kubus hanya figure -->
                <template v-else-if="inCubeFigures(s, n).length">
                  <strong>Action figure</strong>
                  <small>{{ inCubeFigures(s, n).length }} figure</small>
                </template>
                <!-- Kubus kosong -->
                <small v-else class="empty">Kosong</small>
              </span>

              <!-- Zona Bawah: Spines Buku & Figures -->
              <div
                class="cube-bottom"
                :class="{
                  'is-mixed': inCube(s, n).length && inCubeFigures(s, n).length,
                  'is-figures-only': !inCube(s, n).length && inCubeFigures(s, n).length,
                }"
              >
                <!-- Punggung Buku -->
                <span v-if="inCube(s, n).length" class="spines" aria-hidden="true">
                  <i
                    v-for="(b, idx) in inCube(s, n).slice(0, 14)"
                    :key="b.id"
                    :style="{
                      height: spineHeight(b.title) + '%',
                      width: spineWidth(b.title) + 'px',
                      background: `hsl(${hueFor(b.title)} 38% 38%)`,
                      '--i': idx,
                    }"
                  />
                </span>

                <!-- Zona Figure -->
                <span v-if="inCubeFigures(s, n).length" class="figs" aria-hidden="true">
                  <span
                    v-for="fig in figuresLayout(s, n).shown"
                    :key="fig.id"
                    class="fig-item"
                    :class="`fig-${fig.size}`"
                    :title="`${fig.name} (${fig.size})`"
                  >
                    <IconsIconFigure :size="fig.size === 'besar' ? 22 : fig.size === 'medium' ? 16 : 11" />
                  </span>
                  <span
                    v-if="figuresLayout(s, n).hidden.length"
                    class="figs-overflow"
                    :title="`+${figuresLayout(s, n).hidden.length} figure lainnya`"
                    :aria-label="`+${figuresLayout(s, n).hidden.length} figure lainnya`"
                  >
                    +{{ figuresLayout(s, n).hidden.length }}
                  </span>
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Panel Isi Kubus (Drawer) -->
      <div v-if="selected" class="drawer">
        <div class="drawer-head">
          <div class="drawer-title-wrap">
            <h2>
              Rak {{ selected.shelf }}, kubus {{ selected.cube }}
            </h2>
            <span v-if="cubeCategory(selectedBooks)" class="drawer-cat">{{ cubeCategory(selectedBooks) }}</span>
          </div>
          <div v-if="isOwner" class="drawer-actions">
            <NuxtLink
              class="btn btn-primary"
              :to="{ path: '/tambah', query: { rak: selected.shelf, kubus: selected.cube } }"
            >
              <IconsIconPlus :size="16" />
              <span>Tambah buku ke kubus ini</span>
            </NuxtLink>
            <NuxtLink
              class="btn btn-primary"
              :to="{ path: '/figure/tambah', query: { rak: selected.shelf, kubus: selected.cube } }"
            >
              <IconsIconPlus :size="16" />
              <span>Tambah figure ke kubus ini</span>
            </NuxtLink>
          </div>
        </div>

        <!-- State Kosong jika tidak ada buku dan tidak ada figure -->
        <div v-if="!selectedBooks.length && !selectedFigures.length" class="notice empty-state">
          <span class="empty-icon" aria-hidden="true">
            <IconsIconBook :size="40" />
          </span>
          <p>Kubus ini masih kosong.</p>
        </div>

        <!-- Buku di dalam kubus -->
        <div v-if="selectedBooks.length" class="drawer-books-section">
          <div class="grid">
            <BookCard v-for="b in selectedBooks" :key="b.id" :book="b" />
          </div>
        </div>

        <!-- Figure di dalam kubus -->
        <div v-if="selectedFigures.length" class="drawer-figures-section">
          <h3 class="drawer-subtitle">Action figure</h3>
          <div class="drawer-fig-grid">
            <FigureCard
              v-for="f in selectedFigures"
              :key="f.id"
              :figure="f"
              :show-location="false"
            />
          </div>
        </div>
      </div>

      <!-- Belum Ditempatkan -->
      <div v-if="unplaced.length || unplacedFigures.length" class="drawer drawer-unplaced">
        <div class="drawer-head">
          <div class="drawer-title-wrap">
            <h2>Belum ditempatkan ({{ unplaced.length + unplacedFigures.length }})</h2>
          </div>
        </div>

        <!-- Buku belum ditempatkan -->
        <div v-if="unplaced.length" class="drawer-books-section">
          <h3 v-if="unplacedFigures.length" class="drawer-subtitle">Buku ({{ unplaced.length }})</h3>
          <div class="grid">
            <BookCard v-for="b in unplaced" :key="b.id" :book="b" />
          </div>
        </div>

        <!-- Figure belum ditempatkan -->
        <div
          v-if="unplacedFigures.length"
          class="drawer-figures-section"
          :style="{ marginTop: unplaced.length ? '1.5rem' : '0' }"
        >
          <h3 v-if="unplaced.length" class="drawer-subtitle">Action figure ({{ unplacedFigures.length }})</h3>
          <div class="drawer-fig-grid">
            <FigureCard
              v-for="f in unplacedFigures"
              :key="f.id"
              :figure="f"
            />
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
