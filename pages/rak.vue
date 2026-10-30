<script setup lang="ts">
import { CUBE_COUNT, CUBE_COLS, SHELF_COUNT, type Book } from '~/composables/useBooks'

useHead({ title: 'Rak · Perpustakaan Mini' })
const { books, loaded, error } = useBooks()
const { isOwner } = useAuth()

const selected = ref<{ shelf: number; cube: number } | null>(null)

const inCube = (shelf: number, cube: number): Book[] =>
  books.value.filter((b) => b.shelf === shelf && b.cube === cube)

// Kategori kubus diambil dari buku di dalamnya. Kubus kosong tidak punya nama kategori.
const cubeCategory = (list: Book[]) => list.find((b) => b.category)?.category ?? ''

const selectedBooks = computed(() =>
  selected.value ? inCube(selected.value.shelf, selected.value.cube) : [],
)
const unplaced = computed(() => books.value.filter((b) => !b.shelf || !b.cube))

const pick = (shelf: number, cube: number) => {
  const same = selected.value?.shelf === shelf && selected.value?.cube === cube
  selected.value = same ? null : { shelf, cube }
}
</script>

<template>
  <section>
    <div class="intro">
      <h1>Rak</h1>
      <p class="lede">Pilih kubus untuk melihat buku di dalamnya.</p>
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
              :aria-label="`Rak ${s}, kubus ${n}, ${inCube(s, n).length} buku`"
              @click="pick(s, n)"
            >
              <span class="cube-num">{{ n }}</span>
              <span class="cube-label">
                <template v-if="inCube(s, n).length">
                  <strong>{{ cubeCategory(inCube(s, n)) || 'Tanpa kategori' }}</strong>
                  <small>{{ inCube(s, n).length }} buku</small>
                </template>
                <small v-else class="empty">Kosong</small>
              </span>
              <span class="spines" aria-hidden="true">
                <i
                  v-for="b in inCube(s, n).slice(0, 14)"
                  :key="b.id"
                  :style="{
                    height: spineHeight(b.title) + '%',
                    width: spineWidth(b.title) + 'px',
                    background: `hsl(${hueFor(b.title)} 38% 38%)`,
                  }"
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="selected" class="drawer">
        <div class="drawer-head">
          <h2>
            Rak {{ selected.shelf }}, kubus {{ selected.cube }}
            <span v-if="cubeCategory(selectedBooks)" class="drawer-cat">{{ cubeCategory(selectedBooks) }}</span>
          </h2>
          <NuxtLink
            v-if="isOwner"
            class="btn"
            :to="{ path: '/tambah', query: { rak: selected.shelf, kubus: selected.cube } }"
          >
            Tambah buku ke kubus ini
          </NuxtLink>
        </div>
        <p v-if="!selectedBooks.length" class="notice">Kubus ini masih kosong.</p>
        <div v-else class="grid">
          <BookCard v-for="b in selectedBooks" :key="b.id" :book="b" />
        </div>
      </div>

      <div v-if="unplaced.length" class="drawer">
        <h2>Belum ditempatkan ({{ unplaced.length }})</h2>
        <div class="grid">
          <BookCard v-for="b in unplaced" :key="b.id" :book="b" />
        </div>
      </div>
    </template>
  </section>
</template>
