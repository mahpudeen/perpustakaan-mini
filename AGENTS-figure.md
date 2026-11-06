# AGENTS-figure.md: Koleksi action figure

Tugasmu: menambah **koleksi action figure** ke Perpustakaan Mini. Figure punya data, form, daftar, dan halaman sendiri, terpisah dari buku, tetapi **menempati rak dan kubus yang sama**. Tujuannya sederhana: menyimpan data supaya tidak hilang.

Semua keputusan di dokumen ini sudah final. Ikuti, jangan bertanya soal pilihan yang sudah tertulis. **Kode dan perilaku buku yang sudah ada tidak boleh diubah.**

---

## 1. Lingkup

### Dibuat baru
- `composables/useFigures.ts`, `utils/figure.ts` (fungsi murni), `utils/figureTable.ts` (fungsi murni untuk daftar), `components/FigureForm.vue`, `components/ui/ComboInput.vue`, `components/icons/IconFigure.vue` (dan ikon lain yang dibutuhkan; kalau `components/icons/` sudah ada, pakai ulang dan jangan menimpa)
- Halaman: `pages/figure/index.vue`, `pages/figure/tambah.vue`, `pages/figure/impor.vue`, `pages/figure/[id].vue`

### Diubah, **hanya menambah** (jangan menghapus atau mengubah baris yang sudah ada)
- `pages/rak.vue`: tampilkan figure di kubus dan di panel isi kubus (bagian 5)
- `layouts/default.vue`: satu link navigasi "Figure" mengikuti pola link yang ada (desktop; dan tab bar mobile bila sudah ada). Tidak ada perubahan lain
- `firestore.rules`: tambah satu blok `match /figures/{figureId}` (bagian 7)
- `assets/main.css`: tambah styling baru di akhir file
- `README.md`: tambah baris fitur

### Dilarang disentuh
`composables/useBooks.ts`, `useCategories.ts`, `useAuth.ts`, `components/BookForm.vue`, `BookCard.vue`, `BookCover.vue`, `IsbnScanner.vue`, `pages/index.vue`, `pages/buku/[id].vue`, `pages/kategori.vue`, `pages/tambah.vue`, `pages/masuk.vue`, `plugins/`, `middleware/`, `package.json`, `nuxt.config.ts`, serta fitur impor buku bila sudah ada. Tidak ada dependency baru. Boleh **mengimpor** konstanta dan fungsi yang sudah diekspor (misalnya `SHELF_COUNT`, `CUBE_COUNT`, `CUBE_COLS` dari `useBooks.ts`, `compressImage` dari `utils/image.ts`, `middleware: 'owner'`, `useAuth()`), tetapi tidak mengubah isinya.

Tidak ada warning di form buku untuk kubus yang berisi figure. Itu keputusan pemilik. Kolom Penulis di `BookForm.vue` (yang memakai `datalist`) **tidak dirapikan dan tidak disentuh**: perbaikan tampilan combobox hanya untuk figure.

---

## 2. Data

Koleksi Firestore **`figures`**, satu dokumen per figure:

| Field | Tipe | Keterangan |
|---|---|---|
| `name` | string | wajib, maksimal 200 karakter |
| `anime` | string | opsional, maksimal 100 karakter, teks bebas berisi nama seri (contoh `One Piece`). Dipakai untuk mengelompokkan dan memfilter, misalnya seri `One Piece` berisi figure Luffy, Zoro, Sanji |
| `size` | `'besar'` \| `'medium'` \| `'kecil'` | wajib, bawaan form `medium` |
| `purchaseDate` | string `YYYY-MM-DD` atau `''` | opsional |
| `photoData` | string `data:image/...;base64,...` atau `''` | opsional, hasil `compressImage` (foto kecil tidak masalah) |
| `shelf` | `1`..`2` atau `null` | rak |
| `cube` | `1`..`15` atau `null` | kubus (baris x 3 kolom seperti buku) |
| `createdAt`, `updatedAt` | server timestamp | |

Rak dan kubus diisi bersama atau dikosongkan bersama (validasi yang sama dengan form buku: `Pilih rak dan kubus sekaligus, atau kosongkan keduanya.`). Hanya itu validasi yang memblokir simpan, ditambah nama wajib.

`useFigures()` meniru pola `useBooks()` (baca `composables/useBooks.ts` sebagai contoh, jangan diubah): `onSnapshot` realtime sekali jalan lewat `useState`, hasil diurutkan menurut nama, lalu `figures`, `loaded`, `error`, `addFigure`, `updateFigure`, `removeFigure`, dan `importFigures(inputs)` (lihat bagian 6, memakai `writeBatch`, potong per 400 dokumen). Ekspor juga tipe `Figure` dan `FigureInput`.

---

## 3. Kapasitas kubus (`utils/figure.ts`)

Pakai **bilangan bulat satuan seperempat** supaya tidak ada masalah desimal:

| Size | Satuan | Muat per kubus |
|---|---|---|
| besar | 4 | 1 |
| medium | 2 | 2 |
| kecil | 1 | 4 |

Kapasitas satu kubus = **4 satuan**. Campuran boleh: 1 medium + 2 kecil = 4 (pas penuh).

Fungsi murni yang harus ada dan diekspor:
- `slotOf(size)` mengembalikan 4, 2, atau 1
- `sizeLabel(size)` mengembalikan `Besar`, `Medium`, atau `Kecil`
- `cubeLoad(figures, shelf, cube, excludeId?)` menjumlahkan satuan figure di kubus itu
- `layoutCube(figuresInCube)` mengurutkan figure berdasarkan size (besar, medium, kecil) lalu nama, lalu mengembalikan `{ shown, hidden }` dengan menampilkan figure berurutan **selama total satuan <= 4**; sisanya masuk `hidden`
- `uniqueAnime(figures)` mengembalikan daftar nilai `anime` unik: spasi di pinggir dibuang, nilai kosong dibuang, duplikat dibandingkan **tanpa peka huruf besar/kecil** (ejaan pertama yang dipakai), diurutkan dengan `a.localeCompare(b, 'id')`
- `canonicalAnime(value, existing)` membuang spasi di pinggir dan, bila `value` sama dengan salah satu `existing` tanpa peka huruf besar/kecil, mengembalikan **ejaan yang sudah ada** (jadi `one piece` otomatis menjadi `One Piece`); selain itu mengembalikan `value` yang sudah dirapikan, dan `''` bila kosong

---

## 4. Form (`components/FigureForm.vue`)

Dipakai oleh halaman tambah dan mode ubah. Props dan emit mengikuti pola `BookForm` (`initial`, `excludeId`, `saving`, `submitLabel`, emit `submit` dengan `FigureInput`).

Field berurutan:
1. **Nama** (wajib), contoh `Monkey D. Luffy`
2. **Anime** (opsional): combobox teks bebas dengan pilihan dari anime yang sudah dipakai figure lain (lihat "Combobox Anime" di bawah). Teks bantu: `Pilih dari anime yang sudah ada atau ketik yang baru.` Placeholder: `Contoh: One Piece`
3. **Size**: pilihan Besar, Medium, Kecil, bawaan Medium. Teks bantu di bawahnya: `Besar: 1 per kubus. Medium: 2 per kubus. Kecil: 4 per kubus.`
4. **Tgl beli** (input tanggal)
5. **Letak di rak**: dua dropdown Rak dan Kubus (label kubus sama dengan form buku: `Kubus 7 (baris 3, kolom 1)`)
6. **Foto**: tombol pilih atau foto, pratinjau, tombol hapus foto. Kecilkan memakai `compressImage` yang sudah ada. Pesan error bila gagal

Daftar pilihan dan penyeragaman ejaan di `FigureForm.vue`:

```ts
const { figures } = useFigures()
const existingAnime = computed(() => uniqueAnime(figures.value))
// saat submit: anime: canonicalAnime(form.anime, existingAnime.value)
```

### Combobox Anime (`components/ui/ComboInput.vue`)

Pemilik bisa **mengetik langsung** atau **memilih** dari anime yang sudah ada. Komponen ini baru dan **hanya dipakai di form figure**. Pola dasarnya `<input list>` + `<datalist>` bawaan browser (ringan dan nyaman di HP), tetapi dibungkus supaya input dan tombol panah terlihat sebagai **satu kontrol**, bukan input di satu sisi dan select di sisi lain.

- Props: `modelValue: string`, `options: string[]`, `id: string`, `placeholder?: string`. Emit: `update:modelValue`. Dipakai dengan `v-model="form.anime"` dan `:options="existingAnime"`. Label tetap lewat `<label class="field">` dengan `for` ke `id` (atau label membungkus komponen).
- **Tidak ada `<select>` terpisah** dan tidak ada tombol tambahan di samping input.
- Tinggi, radius, border, dan ring fokus sama persis dengan `.input` lain di form.
- Id datalist unik: `` `${id}-list` ``.

```vue
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
  <svg class="combo-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor"
       stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M5 7.5l5 5 5-5" />
  </svg>
  <datalist :id="`${id}-list`">
    <option v-for="o in options" :key="o" :value="o" />
  </datalist>
</div>
```

```css
.combo { position: relative; }
.combo-input { position: relative; padding-right: 2.75rem; text-overflow: ellipsis; }
/* Panah bawaan Chrome/Edge/Safari dijadikan area klik tak terlihat di atas panah buatan sendiri */
.combo-input::-webkit-calendar-picker-indicator {
  opacity: 0; position: absolute; inset: 0 0 0 auto;
  width: 2.75rem; height: 100%; margin: 0; padding: 0; cursor: pointer;
}
.combo-chevron {
  position: absolute; top: 50%; right: 0.9rem; width: 16px; height: 16px;
  transform: translateY(-50%); pointer-events: none; color: var(--muted);
}
.combo:focus-within .combo-chevron { color: var(--accent); }
```

Gunakan `--muted` (atau `--ink-2` bila token itu sudah ada) dan `--accent` yang sudah ada; jangan hardcode warna. Area klik panah minimal 44 px tingginya. Mode gelap harus tetap terbaca.

Catatan perilaku: Firefox tidak menampilkan panah datalist bawaan, jadi di sana panah hanya hiasan dan daftar muncul saat mengetik atau mengklik dua kali; ini diterima, cukup catat di laporan. Jangan membuat dropdown kustom sendiri.

### Warning (tidak pernah memblokir Simpan)
Muncul di bawah dropdown kubus, reaktif terhadap pilihan rak, kubus, dan size:
1. **Kubus penuh**: bila `cubeLoad(...) + slotOf(size) > 4`. Contoh teks: `Kubus ini sudah terisi dan tidak muat lagi menurut ukuran. Tetap bisa disimpan.` (saat mengubah figure yang sudah ada, abaikan figure itu sendiri lewat `excludeId`)
2. **Kubus berisi buku**: bila ada buku dengan `shelf` dan `cube` yang sama. Contoh teks: `Kubus ini juga berisi N buku. Tetap bisa disimpan.` (baca dari `useBooks()`, hanya membaca)

Kedua warning bisa tampil bersamaan. Gaya kotak peringatan memakai kelas `hint warn` yang sudah ada.

---

## 5. Halaman Rak (`pages/rak.vue`): tambahan saja

Ini bagian yang paling terlihat. Pelajari dulu markup `rak.vue` yang ada, lalu tambahkan. Jangan mengubah cara buku dihitung atau ditampilkan.

### Isi kubus
- Kelompokkan figure per `(shelf, cube)` dengan `useFigures()`. Gunakan `layoutCube` untuk menentukan figure yang tampil.
- **Ikon figure** (siluet orang berdiri, SVG inline `currentColor`, warna dari token aksen, beda dari warna punggung buku) digambar sesuai size memakai grid 2 x 2 di dalam kubus:

```css
.figs { display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr);
        grid-auto-flow: column dense; gap: 3px; }
.fig-besar  { grid-column: span 2; grid-row: span 2; }   /* 1 per kubus */
.fig-medium { grid-row: span 2; }                         /* kolom penuh, 2 per kubus */
.fig-kecil  { }                                           /* 1 sel, 4 per kubus */
```

  `column dense` dipilih supaya kombinasi seperti `kecil, kecil, medium` tetap muat. **Verifikasi** kombinasi ini secara visual atau lewat logika grid: `[besar]`, `[medium, medium]`, `[kecil x4]`, `[kecil, kecil, medium]`, `[kecil, medium, kecil]`, `[medium, kecil, kecil]`. Semuanya harus pas tanpa baris tambahan.
- Bila ada `hidden`, tampilkan chip kecil `+N` di sudut zona figure (dengan `title`/`aria-label` yang jelas). Semua figure tetap terlihat di panel isi kubus.
- **Tata letak kubus**: label tetap di atas. Kubus **hanya figure**: zona figure mengisi area bawah (menggantikan zona punggung buku). Kubus **campur**: zona bawah dibagi dua, punggung buku di kiri (sekitar 45%) dan zona figure di kanan. Tidak boleh ada yang saling menimpa, dan harus terbaca di layar 360 px.
- **Label**: kubus figure saja memakai judul `Action figure` dan keterangan `N figure`. Kubus campur tetap memakai nama kategori buku seperti sekarang dan menambah baris kecil `N figure`. Kubus tanpa figure tidak berubah sama sekali.
- Perbarui `aria-label` tombol kubus: `Rak s, kubus n, X buku, Y figure` (bagian figure dihilangkan bila 0).

### Panel isi kubus (saat kubus dipilih)
- Setelah daftar buku, tambahkan bagian **Action figure** bila ada: grid atau daftar ringkas dengan foto kecil (atau ikon bila tanpa foto), nama (link ke `/figure/<id>`), anime sebagai teks kecil bila ada, badge size. Judul bagian `Action figure`.
- Pesan "Kubus ini masih kosong." hanya muncul bila **tidak ada buku dan tidak ada figure**.
- Tombol pemilik: tambahkan satu tombol kedua `Tambah figure ke kubus ini` ke `/figure/tambah` dengan query `{ rak, kubus }`. Tombol buku yang ada tidak diubah.

### "Belum ditempatkan"
Tambahkan figure tanpa `shelf`/`cube` di bagian yang sudah ada (atau bagian kembarannya di bawahnya), bergaya sama.

---

## 6. Halaman figure

### `pages/figure/index.vue`: daftar
Tabel semantik (`<caption class="sr-only">`, `<th scope="col">`), dibungkus container `overflow-x: auto` (di HP tetap tabel yang bisa digeser).

| Kolom | Isi | Urut |
|---|---|---|
| No | nomor berjalan di seluruh hasil, lanjut antar halaman | tidak |
| Nama | foto kecil 40 px (atau ikon bila kosong) + nama sebagai link ke detail | ya (natural sort, `localeCompare(b, 'id', { numeric: true, sensitivity: 'base' })`) |
| Anime | nama anime sebagai link ke `/figure?anime=<anime>` (memfilter daftar), atau `-` | ya (natural sort, kosong di bawah) |
| Size | badge `Besar`/`Medium`/`Kecil` | ya (urutan besar, medium, kecil) |
| Tgl Beli | format `5 Nov 2026` (`id-ID`, jangan `new Date("YYYY-MM-DD")` langsung) | ya |
| Letak | `Rak 1, kubus 4` atau `-` | ya (rak lalu kubus numerik, belum ditempatkan di bawah) |
| Aksi | ikon Detail (semua), ikon Edit (**hanya `isOwner`**, ke `/figure/<id>?ubah=1`) | tidak |

- Bawaan urut **Nama naik**. Klik header kolom lain: naik; klik kolom aktif: balik naik/turun. Nilai kosong selalu di bawah, baik naik maupun turun. Header berupa `<button>` dengan `aria-sort`.
- **Pencarian** di Nama dan Anime (tidak peka huruf besar/kecil; semua kata harus ketemu di gabungan nama + anime, jadi `one piece luffy` menemukan figure Luffy dari One Piece).
- **Filter anime**: dropdown `Semua anime` (bawaan), lalu anime yang ada beserta jumlah figure (contoh `One Piece (12)`, urut abjad, dari `uniqueAnime`), lalu `Tanpa anime` (nilai internal `__none`). Perbandingan tidak peka huruf besar/kecil.
- **Filter size**: dropdown `Semua size`, `Besar`, `Medium`, `Kecil`. Filter anime dan size bisa dipakai bersamaan.
- **Pagination**: 10, 25, 50, 100 (bawaan 10), ringkasan `Menampilkan 1-10 dari 40 figure` (`aria-live="polite"`), tombol `Sebelumnya`/`Berikutnya` dan nomor halaman dengan elipsis. Kembali ke halaman 1 saat pencarian, filter, urutan, atau baris per halaman berubah, dan jepit halaman bila data menyusut.
- **State di URL** (`router.replace`, `route.query` sebagai sumber): `q`, `anime`, `size`, `urut` (`nama`, `anime`, `size`, `tgl`, `letak`), `arah`, `hal`, `per`. Nilai bawaan tidak ditulis. Simpan query terakhir ke `useState('figure-list-query', () => ({}))` untuk link kembali dari detail.
- Tombol pemilik di atas daftar: `Tambah figure` (ke `/figure/tambah`) dan `Impor JSON` (ke `/figure/impor`), dengan `v-if="isOwner"`.
- Skeleton 5 baris saat `!loaded`, pesan kosong saat belum ada figure, `Tidak ada figure yang cocok.` plus tombol Reset saat hasil filter kosong, pesan peringatan saat `error`.
- Boleh menyalin pola kode dari `pages/index.vue` bila sudah berbentuk tabel. Fungsi umum seperti `naturalCompare`, `paginate`, `buildPageList`, `formatTanggal` dari `utils/bookTable.ts` boleh **diimpor** bila ada (tanpa mengubahnya). Bila tidak ada, tulis sendiri di `utils/figureTable.ts`.

### `pages/figure/tambah.vue`
`definePageMeta({ middleware: 'owner' })`. Membaca `route.query.rak`/`kubus` untuk nilai awal, mengikuti `pages/tambah.vue`. Setelah simpan, `navigateTo('/figure/<id>')`.

### `pages/figure/[id].vue`: detail
- Foto besar (sesuai yang tersimpan), nama (judul), anime (link ke `/figure?anime=<anime>`, hanya bila ada), badge size, tanggal beli, letak (link ke `/rak`).
- Pemilik melihat tombol Ubah dan Hapus (hapus dengan `confirm`). Mode ubah memakai `FigureForm`, aktif bila `?ubah=1`, **hanya bila `editing && isOwner`** (form tidak boleh tampil untuk non-pemilik). Setelah keluar dari mode ubah, bersihkan `ubah` dari URL lewat `watch` terpisah.
- Link "Kembali ke daftar" memakai query dari `useState('figure-list-query')`.

### `pages/figure/impor.vue`: impor massal (tempel JSON)
Khusus pemilik (`middleware: 'owner'`).

**Cek dulu apakah impor JSON untuk buku sudah ada**: `grep -ril "impor\|import" pages components composables | grep -v node_modules`. Bila ada, **pelajari polanya dan ikuti** (UX, pesan, penamaan kunci, urutan langkah) untuk figure tanpa mengubah kode buku. Bila belum ada, bangun sesuai spesifikasi ini:

- Satu `<textarea>` untuk menempel JSON (tanpa upload file) dan tombol `Periksa data`.
- Format yang diterima: array objek, atau objek `{ "figures": [ ... ] }`:

```json
[
  { "name": "Iron Man Mark 85", "size": "besar", "purchaseDate": "2024-03-15", "shelf": 1, "cube": 3 },
  { "name": "Monkey D. Luffy", "anime": "One Piece", "size": "medium" },
  { "name": "Roronoa Zoro", "anime": "one piece", "size": "medium" }
]
```

- `size` tidak peka huruf besar/kecil. `anime`, `purchaseDate`, `shelf`, `cube` opsional. Ejaan `anime` diseragamkan dengan `canonicalAnime`: terhadap anime yang sudah ada di database **dan** terhadap baris sebelumnya di JSON yang sama (pada contoh di atas, `one piece` menjadi `One Piece`). Rak dan kubus harus diisi bersama atau kosong bersama. Foto tidak diimpor, ditambahkan nanti lewat form ubah. Tampilkan catatan ini di halaman.
- **Pemeriksaan sebelum menyimpan**: parse JSON (pesan jelas bila JSON rusak), batas 500 baris, lalu tabel pratinjau (termasuk kolom Anime setelah diseragamkan) dengan status tiap baris (`Valid` atau alasan tidak valid: nama kosong, size tidak dikenal, anime lebih dari 100 karakter, tanggal bukan `YYYY-MM-DD`, rak/kubus di luar rentang atau tidak berpasangan). Ringkasan `12 valid, 2 tidak valid`.
- Centang `Lewati nama yang sudah ada` (aktif secara bawaan, perbandingan nama tidak peka huruf) dan tandai baris yang terlewati.
- Tombol `Impor N figure` hanya menyimpan baris valid (dan tidak terlewati) lewat `importFigures`. Setelah selesai tampilkan jumlah yang berhasil dan tautan ke `/figure`. Baris tidak valid tidak pernah ditulis.

---

## 7. Aturan Firestore

Tambahkan blok ini di `firestore.rules` tanpa mengubah blok `books` dan `categories`. **Gunakan nilai UID yang sama dengan blok yang sudah ada di file** (bila placeholder `GANTI_DENGAN_UID_KAMU` sudah diganti pemilik, pakai nilai aslinya; bila belum, pakai placeholder yang sama):

```
match /figures/{figureId} {
  allow read: if true;

  allow create, update: if request.auth != null
    && request.auth.uid == '<UID YANG SAMA DENGAN BLOK BOOKS>'
    && request.resource.data.name is string
    && request.resource.data.name.size() > 0
    && request.resource.data.name.size() <= 200
    && request.resource.data.size in ['besar', 'medium', 'kecil']
    && (!('anime' in request.resource.data)
        || (request.resource.data.anime is string && request.resource.data.anime.size() <= 100))
    && (!('photoData' in request.resource.data)
        || request.resource.data.photoData.size() <= 150000);

  allow delete: if request.auth != null
    && request.auth.uid == '<UID YANG SAMA DENGAN BLOK BOOKS>';
}
```

Beri tahu pemilik di laporan akhir bahwa rules harus **ditempel ulang dan dipublikasikan** di konsol Firebase.

---

## 8. Cara kerja dan verifikasi

1. Sebelum mulai: `git init` (bila belum), `git add -A && git commit -m "baseline"`, pastikan `npm install && npx nuxt build` lolos.
2. Urutan kerja: `utils/figure.ts` dan `useFigures.ts`, `FigureForm`, halaman tambah dan detail, daftar, rak, impor, link navbar, rules, styling.
3. Uji fungsi murni dengan skrip sementara (jangan di-commit). Wajib benar:
   - `slotOf`: besar 4, medium 2, kecil 1.
   - `layoutCube` dengan `[kecil x5]`: 4 tampil, 1 tersembunyi. Dengan `[medium, kecil, kecil, kecil]`: 3 tampil (total 4), 1 tersembunyi. Dengan `[besar, kecil]`: besar tampil, kecil tersembunyi.
   - `cubeLoad` mengabaikan `excludeId`, dan hanya menghitung figure di rak dan kubus yang sama.
   - Urutan: `["Naruto 10","Naruto 2","Naruto 01"]` terurut `Naruto 01, Naruto 2, Naruto 10`.
   - `uniqueAnime` dari figure dengan anime `["One Piece", "one piece ", " Naruto", "", "Bleach"]` menghasilkan `["Bleach", "Naruto", "One Piece"]`.
   - `canonicalAnime("one piece", ["One Piece"])` = `"One Piece"`; `canonicalAnime("Bleach", ["One Piece"])` = `"Bleach"`; `canonicalAnime("   ", [])` = `""`.
4. Bila `npm run dev` bisa dijalankan dengan Firebase, cek manual di lebar 375, 768, 1280 px: tambah, ubah, hapus figure; kedua warning di form muncul dan **tidak** menghalangi Simpan; kolom Anime tampil sebagai **satu kontrol** (input dengan panah di dalamnya, bukan select terpisah), bisa diketik langsung maupun dipilih dari anime yang ada, dan mengetik `one piece` menyimpan ejaan `One Piece`; filter anime di daftar bekerja bersama pencarian dan filter size; kubus campur buku dan figure tampil rapi; `+N` muncul saat melebihi kapasitas; non-pemilik tidak melihat ikon Edit maupun form meski membuka `?ubah=1`; impor menolak JSON rusak dan baris tidak valid. Bila tidak bisa (tanpa kredensial), nyatakan jelas di laporan bagian mana yang belum diuji di browser.
5. Cek lingkup (harus **kosong**):

```bash
git diff --stat -- composables/useBooks.ts composables/useCategories.ts composables/useAuth.ts \
  components/BookForm.vue components/BookCard.vue components/BookCover.vue components/IsbnScanner.vue \
  pages/index.vue 'pages/buku/[id].vue' pages/kategori.vue pages/tambah.vue pages/masuk.vue \
  plugins middleware package.json nuxt.config.ts
# file yang boleh berubah hanya menambah baris (jumlah baris dihapus harus 0 atau sangat kecil dan bisa dijelaskan):
git diff --numstat -- pages/rak.vue layouts/default.vue firestore.rules assets/main.css README.md
```

---

## 9. Definisi selesai

- [ ] Koleksi `figures` dengan form (nama, anime, size, tgl beli, foto, rak/kubus), tambah, ubah, hapus
- [ ] Daftar `/figure` berupa tabel dengan pencarian nama, filter size, urutan, pagination, dan state di URL
- [ ] Dua warning di form (kubus penuh, kubus berisi buku) yang tidak pernah memblokir Simpan
- [ ] Field Anime berupa combobox rapi (`ComboInput`, satu kontrol, ketik atau pilih), ejaan diseragamkan, `BookForm.vue` tidak berubah
- [ ] Daftar figure punya kolom Anime, filter anime, dan pencarian Nama + Anime
- [ ] Rak menampilkan ikon figure menurut size (besar 1, medium 2, kecil 4 per kubus), kubus campur rapi, `+N` untuk kelebihan, label dan `aria-label` terbarui, panel isi kubus memuat figure
- [ ] Impor massal JSON dengan pratinjau dan pemeriksaan, hanya baris valid yang disimpan
- [ ] Link "Figure" di navigasi, aturan Firestore untuk `figures`
- [ ] Fungsi murni lolos uji (butir 3), cek lingkup bersih (butir 5), `npx nuxt build` lolos, tidak ada dependency baru
- [ ] Laporan akhir berisi daftar file yang diubah atau dibuat, bagian yang sudah dan belum diuji di browser, pengingat menempel ulang rules, serta **Saran untuk pemilik** (opsional)