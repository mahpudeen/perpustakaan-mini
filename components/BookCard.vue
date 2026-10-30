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
      <p class="card-where">
        <template v-if="book.shelf && book.cube">Rak {{ book.shelf }}, kubus {{ book.cube }}</template>
        <template v-else>Belum ditempatkan</template>
      </p>
    </div>
  </NuxtLink>
</template>
