<script setup lang="ts">
import { parseRupiah, formatAngka } from '~/utils/rupiah'

const props = defineProps<{
  modelValue: number | null
  id?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [val: number | null]
}>()

const displayValue = ref(props.modelValue != null ? formatAngka(props.modelValue) : '')

watch(
  () => props.modelValue,
  (next) => {
    const formatted = next != null ? formatAngka(next) : ''
    if (parseRupiah(displayValue.value) !== next) {
      displayValue.value = formatted
    }
  },
)

const onInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const parsed = parseRupiah(target.value)
  const formatted = parsed != null ? formatAngka(parsed) : ''
  displayValue.value = formatted
  target.value = formatted
  emit('update:modelValue', parsed)
}
</script>

<template>
  <div class="price-input-wrap">
    <span class="price-prefix" aria-hidden="true">Rp</span>
    <input
      :id="id"
      :value="displayValue"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      placeholder="0"
      class="input price-input"
      @input="onInput"
    />
  </div>
</template>
