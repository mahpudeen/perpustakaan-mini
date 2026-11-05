<script setup lang="ts">
import { randomColor, type CategoryInput } from '~/composables/useCategories'

definePageMeta({ middleware: 'owner' })
useHead({ title: 'Kelola Kategori — Perpustakaan Mini' })

const { categories, loaded, error, addCategory, updateCategory, removeCategory } = useCategories()
const { books } = useBooks()

/* ── State ────────────────────────────────────────────── */
const showForm = ref(false)
const saving = ref(false)
const deleting = ref<string | null>(null)
const formError = ref('')
const editId = ref<string | null>(null)

const form = reactive<CategoryInput>({ name: '', color: randomColor(), description: '' })

const bookCountByCategory = computed(() => {
  const map: Record<string, number> = {}
  for (const b of books.value) {
    if (b.category) map[b.category] = (map[b.category] ?? 0) + 1
  }
  return map
})

/* ── Helpers ──────────────────────────────────────────── */
const openAdd = () => {
  editId.value = null
  form.name = ''
  form.color = randomColor()
  form.description = ''
  formError.value = ''
  showForm.value = true
}

const openEdit = (cat: { id: string; name: string; color: string; description: string }) => {
  editId.value = cat.id
  form.name = cat.name
  form.color = cat.color
  form.description = cat.description
  formError.value = ''
  showForm.value = true
}

const closeForm = () => {
  showForm.value = false
  editId.value = null
  formError.value = ''
}

const save = async () => {
  if (!form.name.trim()) { formError.value = 'Nama kategori wajib diisi.'; return }
  const nameTrimmed = form.name.trim()
  const duplicate = categories.value.find(
    (c) => c.name.toLowerCase() === nameTrimmed.toLowerCase() && c.id !== editId.value,
  )
  if (duplicate) { formError.value = 'Nama kategori sudah ada.'; return }

  saving.value = true
  formError.value = ''
  try {
    const payload: CategoryInput = { name: nameTrimmed, color: form.color, description: form.description.trim() }
    if (editId.value) await updateCategory(editId.value, payload)
    else await addCategory(payload)
    closeForm()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Gagal menyimpan.'
  } finally {
    saving.value = false
  }
}

const confirmDelete = async (cat: { id: string; name: string }) => {
  const count = bookCountByCategory.value[cat.name] ?? 0
  const msg = count > 0
    ? `Hapus kategori "${cat.name}"? Ada ${count} buku dengan kategori ini (buku tidak dihapus, hanya relasi kategorinya yang hilang).`
    : `Hapus kategori "${cat.name}"?`
  if (!confirm(msg)) return
  deleting.value = cat.id
  try {
    await removeCategory(cat.id)
  } finally {
    deleting.value = null
  }
}
</script>

<template>
  <div class="cat-page">
    <div class="page-head">
      <div>
        <NuxtLink to="/" class="back">← Kembali ke daftar</NuxtLink>
        <h1>Kategori</h1>
        <p class="lede">Kelola daftar kategori buku. Setiap buku mengacu ke salah satu kategori ini.</p>
      </div>
      <button class="btn btn-primary" type="button" @click="openAdd">
        <IconsIconPlus :size="16" />
        <span>Tambah kategori</span>
      </button>
    </div>

    <!-- Form modal -->
    <Teleport to="body">
      <div v-if="showForm" class="modal-backdrop" @click.self="closeForm">
        <div class="modal" role="dialog" aria-modal="true" :aria-label="editId ? 'Edit kategori' : 'Tambah kategori'">
          <div class="modal-head">
            <h2>{{ editId ? 'Edit kategori' : 'Tambah kategori' }}</h2>
            <button class="modal-close" type="button" aria-label="Tutup" @click="closeForm">✕</button>
          </div>

          <form class="cat-form" @submit.prevent="save">
            <label class="field">
              <span>Nama kategori <span class="req">*</span></span>
              <input
                v-model="form.name"
                class="input"
                placeholder="Misal: Fiksi, Sains, Sejarah…"
                required
                autofocus
              />
            </label>

            <label class="field">
              <span>Warna penanda</span>
              <div class="color-row">
                <div
                  v-for="c in ['#4f7fe8','#e07b4a','#5cb97a','#c45c8a','#8e6fc1','#e8a93d','#4db8c2','#d45b5b','#78a856','#a07040']"
                  :key="c"
                  class="color-swatch"
                  :class="{ selected: form.color === c }"
                  :style="{ background: c }"
                  :title="c"
                  role="radio"
                  :aria-checked="form.color === c"
                  tabindex="0"
                  @click="form.color = c"
                  @keydown.enter.space.prevent="form.color = c"
                />
              </div>
            </label>

            <label class="field">
              <span>Deskripsi <span class="req-opt">(opsional)</span></span>
              <input v-model="form.description" class="input" placeholder="Catatan singkat tentang kategori ini" />
            </label>

            <p v-if="formError" class="hint warn" role="alert">{{ formError }}</p>

            <div class="modal-actions">
              <button type="button" class="btn" @click="closeForm">Batal</button>
              <button class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Menyimpan…' : editId ? 'Simpan perubahan' : 'Tambah' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- List -->
    <p v-if="error" class="notice warn">Gagal memuat: {{ error }}</p>
    <p v-else-if="!loaded" class="notice">Memuat…</p>
    <div v-else-if="!categories.length" class="notice empty-state">
      <span class="empty-icon" aria-hidden="true">
        <IconsIconTag :size="48" />
      </span>
      <p>Belum ada kategori. Klik <strong>+ Tambah kategori</strong> untuk mulai.</p>
    </div>

    <ul v-else class="cat-grid">
      <li v-for="cat in categories" :key="cat.id" class="cat-card">
        <div class="cat-top">
          <div class="cat-title-row">
            <span class="cat-dot" :style="{ background: cat.color }" />
            <strong class="cat-name">{{ cat.name }}</strong>
          </div>
          <span class="cat-count-pill">
            {{ bookCountByCategory[cat.name] ?? 0 }} buku
          </span>
        </div>
        <p v-if="cat.description" class="cat-desc">{{ cat.description }}</p>
        <div class="cat-actions">
          <button class="btn btn-ghost" type="button" @click="openEdit(cat)">Edit</button>
          <button
            class="btn btn-danger"
            type="button"
            :disabled="deleting === cat.id"
            @click="confirmDelete(cat)"
          >
            {{ deleting === cat.id ? '…' : 'Hapus' }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.cat-page {
  max-width: 960px;
  margin-inline: auto;
}

.page-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 22, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.modal {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1.75rem;
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow-2);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.modal-head h2 {
  font-family: var(--serif);
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--ink);
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  color: var(--ink-2);
  padding: 0.35rem 0.6rem;
  border-radius: var(--radius-sm);
  line-height: 1;
  transition: background 150ms var(--ease), color 150ms var(--ease);
}

.modal-close:hover {
  background: var(--surface-2);
  color: var(--ink);
}

.cat-form {
  display: grid;
  gap: 1.15rem;
}

.req {
  color: var(--danger);
}

.req-opt {
  color: var(--ink-2);
  font-weight: 400;
  font-size: 0.85rem;
}

.modal-actions {
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

/* Color swatches */
.color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.color-swatch {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid transparent;
  outline: none;
  transition: transform 150ms var(--ease), border-color 150ms var(--ease);
}

.color-swatch:hover {
  transform: scale(1.15);
}

.color-swatch.selected {
  border-color: var(--ink);
  transform: scale(1.18);
  box-shadow: 0 0 0 2px var(--surface);
}

/* Category grid cards */
.cat-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.cat-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1.25rem;
  box-shadow: var(--shadow-1);
  transition: transform 150ms var(--ease), box-shadow 150ms var(--ease), border-color 150ms var(--ease);
}

.cat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-2);
  border-color: color-mix(in srgb, var(--accent) 30%, var(--line));
}

.cat-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.cat-title-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex: 1;
}

.cat-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cat-name {
  font-family: var(--serif);
  font-size: 1.15rem;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.25;
}

.cat-desc {
  font-size: 0.88rem;
  color: var(--ink-2);
  margin: 0;
  line-height: 1.5;
}

.cat-count-pill {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--ink-2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.cat-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid var(--line);
}

.cat-actions .btn {
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  min-height: 32px;
}

@media (max-width: 520px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
