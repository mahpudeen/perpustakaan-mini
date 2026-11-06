<script setup lang="ts">
import type { Figure } from '~/composables/useFigures'
import { sizeLabel } from '~/utils/figure'

withDefaults(
  defineProps<{
    figure: Figure
    showLocation?: boolean
  }>(),
  {
    showLocation: true,
  },
)
</script>

<template>
  <NuxtLink :to="`/figure/${figure.id}`" class="card figure-card">
    <div class="figure-card-cover">
      <img
        v-if="figure.photoData"
        :src="figure.photoData"
        :alt="`Foto ${figure.name}`"
        class="figure-card-img"
        loading="lazy"
      />
      <div v-else class="figure-card-fallback">
        <IconsIconFigure :size="48" />
        <span>Tanpa foto</span>
      </div>
      <span class="badge-size figure-card-badge" :class="`size-${figure.size}`">
        {{ sizeLabel(figure.size) }}
      </span>
    </div>
    <div class="card-body">
      <h3 class="card-title">{{ figure.name }}</h3>
      <p v-if="figure.anime" class="card-author">{{ figure.anime }}</p>
      <div v-if="showLocation" class="card-where">
        <span v-if="figure.shelf && figure.cube" class="card-where-pill">
          <IconsIconCube :size="13" />
          <span>Rak {{ figure.shelf }}, kubus {{ figure.cube }}</span>
        </span>
        <span v-else class="card-where-pill unplaced">
          Belum ditempatkan
        </span>
      </div>
    </div>
  </NuxtLink>
</template>
