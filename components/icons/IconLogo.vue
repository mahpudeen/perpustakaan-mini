<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- 3 standing book spines with different heights -->
    <!-- Spine 1: Oak -->
    <rect x="4" y="8" width="5.5" height="16" rx="1.5" fill="var(--oak)" />
    <!-- Spine 2: Accent (tallest) -->
    <rect x="11.5" y="4" width="5.5" height="20" rx="1.5" fill="var(--accent)" />
    <!-- Spine 3: Oak-deep (medium) -->
    <rect x="19" y="10" width="5.5" height="14" rx="1.5" fill="var(--oak-deep)" />
  </svg>
</template>
