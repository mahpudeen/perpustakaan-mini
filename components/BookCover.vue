<script setup lang="ts">
const props = defineProps<{
  book: { title: string; coverData?: string; coverUrl?: string }
}>()

const broken = ref(false)
const src = computed(() => props.book.coverData || props.book.coverUrl || '')
watch(src, () => (broken.value = false))
</script>

<template>
  <div class="cover">
    <img
      v-if="src && !broken"
      :src="src"
      :alt="`Sampul ${book.title}`"
      loading="lazy"
      @error="broken = true"
    />
    <div
      v-else
      class="cover-fallback"
      :style="{ background: `hsl(${hueFor(book.title)} 36% 36%)` }"
    >
      <span>{{ book.title }}</span>
    </div>
  </div>
</template>
