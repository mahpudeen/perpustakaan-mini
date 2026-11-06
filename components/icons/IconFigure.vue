<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 18 })
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
  >
    <circle cx="12" cy="4" r="2" />
    <path d="M7 9h10" />
    <path d="M12 7v7" />
    <path d="M9 14v8" />
    <path d="M15 14v8" />
    <path d="M7 9v5" />
    <path d="M17 9v5" />
  </svg>
</template>
