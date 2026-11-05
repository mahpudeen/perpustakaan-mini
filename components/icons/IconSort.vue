<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number | string
    direction?: 'asc' | 'desc' | 'none'
  }>(),
  { size: 14, direction: 'none' },
)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="icon-sort"
  >
    <template v-if="direction === 'asc'">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </template>
    <template v-else-if="direction === 'desc'">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </template>
    <template v-else>
      <path d="M7 15l5 5 5-5M7 9l5-5 5 5" opacity="0.4" />
    </template>
  </svg>
</template>
