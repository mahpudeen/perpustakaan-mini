<script setup lang="ts">
import type { Book } from '~/composables/useBooks'
defineProps<{ book: Book }>()
</script>

<template>
  <NuxtLink :to="`/buku/${book.id}`" class="card">
    <BookCover :book="book" />
    <div class="card-body">
      <h3 class="card-title">{{ book.title }}</h3>
      <p v-if="book.author" class="card-author">{{ book.author }}</p>
      <div class="card-where">
        <span v-if="book.shelf && book.cube" class="card-where-pill">
          <IconsIconCube :size="13" />
          <span>Rak {{ book.shelf }}, kubus {{ book.cube }}</span>
        </span>
        <span v-else class="card-where-pill unplaced">
          Belum ditempatkan
        </span>
      </div>
    </div>
  </NuxtLink>
</template>
