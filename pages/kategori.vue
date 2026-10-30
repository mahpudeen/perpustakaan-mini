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
  <div class="narrow">
    <div class="page-head">
      <div>
        <NuxtLink to="/" class="back">← Kembali</NuxtLink>
        <h1>Kategori</h1>
        <p class="lede">Kelola daftar kategori buku. Setiap buku mengacu ke salah satu kategori ini.</p>
      </div>
      <button class="btn btn-primary" type="button" @click="openAdd">+ Tambah kategori</button>
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
    <p v-else-if="!categories.length" class="notice cat-empty">
      Belum ada kategori. Klik <strong>+ Tambah kategori</strong> untuk mulai.
    </p>

    <ul v-else class="cat-list">
      <li v-for="cat in categories" :key="cat.id" class="cat-item">
        <div class="cat-color-bar" :style="{ background: cat.color }" />
        <div class="cat-info">
          <strong class="cat-name">{{ cat.name }}</strong>
          <span v-if="cat.description" class="cat-desc">{{ cat.description }}</span>
          <span class="cat-count">
            {{ bookCountByCategory[cat.name] ?? 0 }} buku
          </span>
        </div>
        <div class="cat-actions">
          <button class="btn" type="button" @click="openEdit(cat)">Edit</button>
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
.page-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(22, 36, 44, 0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 200;
  padding: 1rem;
}
.modal {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 1.75rem;
  width: 100%; max-width: 480px;
  box-shadow: 0 8px 32px rgba(22, 36, 44, 0.22);
}
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1.25rem;
}
.modal-head h2 { font-size: 1.15rem; }
.modal-close {
  background: none; border: none; cursor: pointer;
  font-size: 1.1rem; color: var(--muted); padding: 0.25rem 0.5rem;
  border-radius: 6px; line-height: 1;
}
.modal-close:hover { background: var(--inside); }
.cat-form { display: grid; gap: 1rem; }
.req { color: var(--danger); }
.req-opt { color: var(--muted); font-weight: 400; font-size: 0.88rem; }
.modal-actions { display: flex; gap: 0.6rem; justify-content: flex-end; margin-top: 0.5rem; }

/* Color swatches */
.color-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.25rem; }
.color-swatch {
  width: 2rem; height: 2rem;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid transparent;
  outline: none;
  transition: transform 0.15s, border-color 0.15s;
}
.color-swatch:hover { transform: scale(1.15); }
.color-swatch.selected { border-color: var(--ink); transform: scale(1.18); }

/* Category list */
.cat-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; }
.cat-item {
  display: flex; align-items: center; gap: 1rem;
  background: var(--card); border: 1px solid var(--line);
  border-radius: 10px; overflow: hidden;
  transition: box-shadow 0.15s;
}
.cat-item:hover { box-shadow: 0 2px 8px rgba(22, 36, 44, 0.1); }
.cat-color-bar { width: 6px; align-self: stretch; flex-shrink: 0; }
.cat-info { flex: 1; padding: 0.85rem 0; display: flex; flex-direction: column; gap: 0.2rem; }
.cat-name { font-size: 1rem; }
.cat-desc { font-size: 0.85rem; color: var(--muted); }
.cat-count { font-size: 0.8rem; color: var(--wood-deep); }
.cat-actions { display: flex; gap: 0.5rem; padding-right: 0.85rem; flex-shrink: 0; }
.cat-empty { font-style: italic; }

@media (max-width: 520px) {
  .cat-actions { flex-direction: column; padding: 0.6rem 0.6rem 0.6rem 0; }
  .page-head { flex-direction: column; align-items: flex-start; }
}
</style>
