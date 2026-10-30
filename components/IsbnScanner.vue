<script setup lang="ts">
const emit = defineEmits<{ detected: [isbn: string]; close: [] }>()

const video = ref<HTMLVideoElement>()
const status = ref('Mengaktifkan kamera…')
let controls: { stop: () => void } | null = null
let done = false

onMounted(async () => {
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    const { BarcodeFormat, DecodeHintType } = await import('@zxing/library')
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13])
    const reader = new BrowserMultiFormatReader(hints)

    controls = await reader.decodeFromVideoDevice(undefined, video.value!, (result) => {
      if (done || !result) return
      const text = result.getText()
      // ISBN-13 selalu diawali 978 atau 979
      if (/^97[89]\d{10}$/.test(text)) {
        done = true
        controls?.stop()
        emit('detected', text)
      }
    })
    if (done) controls?.stop()
    else status.value = 'Arahkan barcode ISBN di belakang buku ke kamera.'
  } catch {
    status.value = 'Kamera tidak bisa dibuka. Izinkan akses kamera di browser, atau ketik ISBN secara manual.'
  }
})

onBeforeUnmount(() => {
  done = true
  controls?.stop()
})
</script>

<template>
  <div class="scanner">
    <video ref="video" playsinline muted />
    <p class="scanner-status">{{ status }}</p>
    <button type="button" class="btn" @click="emit('close')">Tutup kamera</button>
  </div>
</template>
