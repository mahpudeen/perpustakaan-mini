<script setup lang="ts">
defineProps<{
  modelValue: string
  options: string[]
  id: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="combo">
    <input
      :id="id"
      class="input combo-input"
      :list="`${id}-list`"
      :placeholder="placeholder"
      autocomplete="off"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <svg
      class="combo-chevron"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M5 7.5l5 5 5-5" />
    </svg>
    <datalist :id="`${id}-list`">
      <option v-for="o in options" :key="o" :value="o" />
    </datalist>
  </div>
</template>
