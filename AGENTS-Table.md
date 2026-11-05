# AGENTS-tabel-buku.md: Daftar buku dalam bentuk tabel

Tugasmu: mengubah halaman **Daftar buku** (`/`, `pages/index.vue`) dari grid kartu menjadi **tabel** dengan urutan, filter kategori, pencarian, dan pagination. Tampilan kartu yang lama tetap ada sebagai pilihan lewat tombol ganti tampilan.

Berbeda dengan `AGENTS.md` (khusus tampilan), tugas ini **mengubah logic**, tetapi **hanya** di file yang disebut di bagian 1. Keputusan desain dan perilaku sudah final. Ikuti, jangan bertanya soal pilihan yang sudah tertulis.

---

## 1. Lingkup

### Boleh dibuat atau diubah
- `pages/index.vue` (script dan template)
- File **baru**: `utils/bookTable.ts` (fungsi murni), `composables/useBookTable.ts` (opsional, bila ingin memisahkan state), `components/BookTable.vue` (opsional), `components/icons/*.vue` (ikon SVG inline; kalau folder sudah ada, pakai ulang dan jangan menimpa file yang ada)
- `assets/main.css`: tambah styling tabel (pakai variabel CSS yang sudah ada seperti `--line`, `--card`, `--ink`, `--muted`, `--accent`; jangan hardcode warna, supaya upgrade tampilan nanti ikut berlaku)
- `pages/buku/[id].vue`: **hanya 3 perubahan kecil** di bagian 7
- `README.md`: tambah satu baris di daftar Fitur

### Dilarang disentuh
`composables/useBooks.ts`, `useCategories.ts`, `useAuth.ts`, `plugins/`, `middleware/`, `firestore.rules`, `package.json`, `nuxt.config.ts`, `layouts/`, `components/BookForm.vue`, `IsbnScanner.vue`, `BookCard.vue`, `BookCover.vue`, `pages/rak.vue`, `kategori.vue`, `tambah.vue`, `masuk.vue`. Tidak ada dependency baru, tidak ada query Firestore baru: semua data sudah ada di `useBooks()` dan `useCategories()`, dan semua pengolahan dilakukan di browser.

---

## 2. Data yang tersedia

`useBooks()` mengembalikan `books`, `loaded`, `error`. Bentuk `Book`:
`id`, `title`, `author`, `isbn`, `code`, `categoryId`, `shelf`, `cube`, `purchaseDate` (string `YYYY-MM-DD` atau kosong), `coverUrl`, `coverData`.

`useCategories()` mengembalikan `categories` (`{ id, name }`) dan `nameOf(id)` (nama kategori, string kosong bila tidak ada). `useAuth()` mengembalikan `isOwner`.

---

## 3. Kolom tabel

| Kolom | Isi | Bisa diurutkan |
|---|---|---|
| No | nomor urut (lihat 4.1) | tidak |
| Kode | `code` | ya |
| Judul | `title`, berupa link ke `/buku/<id>` | ya |
| Pengarang | `author` | ya |
| Kategori | `nameOf(categoryId)` | ya (berdasarkan **nama**, bukan id) |
| Tgl Beli | `purchaseDate`, tampil `5 Nov 2026` (format `id-ID`) | ya |
| Aksi | ikon Detail, ikon Edit | tidak |

- Sel kosong tampil `-` dengan warna pudar.
- Format tanggal: pecah `YYYY-MM-DD` lalu `new Date(y, m - 1, d)` (jangan `new Date("YYYY-MM-DD")` langsung, supaya tidak bergeser zona waktu). Urutkan berdasarkan string aslinya.
- **Aksi**:
  - Ikon mata menuju `/buku/<id>`. Tampil untuk semua pengunjung.
  - Ikon pensil menuju `{ path: '/buku/<id>', query: { ubah: '1' } }`. Tampil **hanya bila `isOwner`** (pakai `v-if="isOwner"` seperti di layout).
  - Kedua ikon adalah link, `aria-label` berisi judul (contoh: `Lihat detail Laskar Pelangi`, `Ubah Laskar Pelangi`) dan `title` sebagai tooltip. Target sentuh minimal 44 x 44 px.

---

## 4. Perilaku

### 4.1 Nomor urut
Nomor berjalan di seluruh hasil (setelah filter dan urutan), lanjut antar halaman: `(halaman - 1) * perHalaman + indeksBaris + 1`. Halaman 2 dengan 10 baris dimulai dari 11. Nomor mengikuti posisi di hasil saat ini, bukan nilai tetap milik buku.

### 4.2 Urutan
- **Bawaan: Kode naik (asc)**.
- Klik header kolom lain: urut naik. Klik header kolom yang sedang aktif: balik naik/turun. Tidak ada keadaan ketiga.
- Header yang bisa diurutkan adalah `<button>` di dalam `<th>`, dengan ikon panah (naik/turun/netral) dan `aria-sort="ascending|descending|none"` pada `<th>`.
- **Natural sort** untuk Kode: `a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' })`. Hasil yang benar: `AGM-01, AGM-2, AGM-10, BIO-1`, bukan `AGM-10` sebelum `AGM-2`. Pakai pembanding yang sama untuk Judul, Pengarang, dan nama Kategori.
- **Nilai kosong selalu di paling bawah**, baik urut naik maupun turun.
- Bila nilai sama, urutan pembeda: Kode (natural, naik), lalu Judul.

### 4.3 Filter kategori
- Dropdown di atas tabel: `Semua kategori` (bawaan), lalu kategori yang punya buku dengan jumlahnya (contoh `Fiksi (12)`, urut abjad), lalu `Tanpa kategori` (untuk buku tanpa `categoryId`; nilai internal `__none`).
- Jumlah dihitung dari seluruh buku, bukan dari hasil pencarian.

### 4.4 Pencarian
- Satu kolom input dengan ikon kaca pembesar dan tombol hapus (x) saat terisi.
- Mencari **hanya** di Kode, Judul, Pengarang. Tidak mencari ISBN maupun nama kategori.
- Tidak peka huruf besar/kecil, spasi di pinggir dibuang. Pisahkan kata dengan spasi: **semua kata** harus ditemukan di gabungan kode + judul + pengarang (`agm 05` menemukan `AGM-05`).
- Berlaku langsung tanpa tombol cari. Tunda penulisan ke URL 250 ms (debounce), tetapi hasil tabel boleh langsung berubah.

### 4.5 Pagination
- Baris per halaman: pilihan **10, 25, 50, 100**, bawaan **10**. Dropdown berlabel "Baris per halaman".
- Teks ringkasan: `Menampilkan 1-10 dari 120 buku` (angka sesuai hasil filter), pasang `aria-live="polite"`. Bila hasil kosong: `0 buku`.
- Navigasi `<nav aria-label="Halaman">`: tombol `Sebelumnya`, nomor halaman, `Berikutnya`. Tampilkan halaman pertama, terakhir, aktif, dan satu di kiri-kanan aktif; sisanya diganti `…`. Halaman aktif memakai `aria-current="page"`. Tombol di ujung `disabled`.
- Bila jumlah halaman hanya 1, sembunyikan navigasi halaman (dropdown baris per halaman dan ringkasan tetap tampil).
- Setiap kali **pencarian, filter, urutan, atau baris per halaman berubah, kembali ke halaman 1**. Bila data berubah (misalnya buku dihapus) dan halaman aktif melebihi total, otomatis dijepit ke halaman terakhir.

### 4.6 Tombol ganti tampilan
- Dua tombol segmen `Tabel` | `Kartu` (dengan ikon), tabel aktif secara bawaan, `aria-pressed` pada tombol aktif.
- Tampilan **Kartu** memakai `BookCard` yang sudah ada dengan grid yang sekarang, memakai **filter, pencarian, urutan, dan pagination yang sama**. Hanya cara menggambarnya yang berbeda. Di mode kartu header urutan tidak ditampilkan (urutan tetap mengikuti state saat ini).

### 4.7 State di URL
Seluruh state disimpan di query string supaya tidak hilang saat membuka detail lalu kembali, dan bisa dibagikan:

| Query | Nilai | Dihilangkan dari URL bila |
|---|---|---|
| `q` | kata pencarian | kosong |
| `kategori` | id kategori atau `__none` | semua |
| `urut` | `kode`, `judul`, `pengarang`, `kategori`, `tgl` | `kode` |
| `arah` | `asc`, `desc` | `asc` |
| `hal` | nomor halaman | `1` |
| `per` | `10`, `25`, `50`, `100` | `10` |
| `tampil` | `tabel`, `kartu` | `tabel` |

- Jadikan `route.query` **sumber kebenaran**: state dibaca dari sana (`computed`) dan ditulis lewat `router.replace` (bukan `push`, supaya tombol Back tidak berjalan mundur per ketikan). Nilai tidak valid di URL otomatis jatuh ke nilai bawaan.
- Link dari menu Kategori (`/?kategori=<id>`) harus tetap berfungsi.
- Simpan juga query terakhir halaman daftar ke `useState('book-list-query', () => ({}))`, dipakai untuk link "Kembali ke daftar" di halaman detail (bagian 7).

### 4.8 Keadaan khusus
- `error`: pakai pesan peringatan yang sudah ada.
- `!loaded`: tampilkan **skeleton** 5 baris tabel (bukan teks "Memuat buku…").
- Koleksi kosong: pakai pesan yang sudah ada.
- Ada buku tapi hasil filter kosong: pesan "Tidak ada buku yang cocok." ditambah tombol **Reset** yang mengosongkan pencarian dan filter kategori.

---

## 5. Struktur kode yang diminta

- Taruh logika murni di `utils/bookTable.ts` dan **ekspor sebagai fungsi biasa** (tanpa Vue, tanpa Firebase), supaya mudah diuji: `naturalCompare`, `filterBooks`, `sortBooks`, `paginate`, `buildPageList` (menghasilkan daftar nomor dan `'…'`), `formatTanggal`.
- `pages/index.vue` (atau `BookTable.vue`) hanya merangkai: ambil state dari URL, panggil fungsi di atas, render.
- Ikon SVG inline: mata, pensil, panah naik/turun/netral, kaca pembesar, x, chevron kiri/kanan, tabel, grid. Dekoratif diberi `aria-hidden="true"`.

## 6. Tampilan

- Gunakan elemen `<table>` semantik: `<caption class="sr-only">Daftar buku</caption>`, `<thead>`, `<th scope="col">`.
- Tabel dibungkus container `overflow-x: auto` dengan `min-width` tabel sekitar 760 px. **Di HP tetap tabel dan bisa digeser ke samping** (bukan kartu bertumpuk). Kolom Judul minimal 220 px lebar supaya terbaca; kolom No dan Aksi sempit.
- Header tabel diberi latar berbeda dan garis bawah, baris dengan garis pemisah tipis dan hover halus. Judul berupa link tanpa garis bawah sampai di-hover.
- Baris kontrol (pencarian, filter kategori, ganti tampilan) satu baris di desktop dan bertumpuk di HP. Baris bawah tabel: ringkasan di kiri, pagination di tengah/kanan, baris per halaman di sisi lain.
- Tidak ada scroll horizontal pada halaman itu sendiri di lebar 360 px (hanya di dalam container tabel).
- Fokus keyboard jelas di semua tombol, link, dan input.

---

## 7. Perubahan di `pages/buku/[id].vue` (hanya ini)

1. **Mode ubah dari URL**: ubah nilai awal `const editing = ref(false)` menjadi `ref(route.query.ubah === '1')`.
2. **Jaga hak akses**: pada template, ubah `<template v-else-if="editing">` menjadi `v-else-if="editing && isOwner"`. Tanpa ini, orang yang mengetik `?ubah=1` bisa melihat form ubah (menyimpan tetap ditolak `firestore.rules`, tapi form tidak boleh tampil).
3. **Link kembali yang mengingat state**: link "Kembali ke daftar" memakai query terakhir dari `useState('book-list-query')`, yaitu `:to="{ path: '/', query: listQuery }"`.

Tambahkan juga `watch` terpisah: ketika `editing` berubah menjadi `false` dan URL masih memuat `ubah`, bersihkan dengan `router.replace`. **Jangan mengubah** fungsi `save`, `remove`, dan bagian lain dari file ini.

---

## 8. Cara kerja dan verifikasi

1. Sebelum mulai: `git init` (jika belum), `git add -A && git commit -m "baseline"`, pastikan `npm install && npx nuxt build` lolos.
2. Urutan kerja: `utils/bookTable.ts`, state URL, tabel dan header urutan, filter dan pencarian, pagination, ganti tampilan, skeleton dan state kosong, perubahan di `[id].vue`, styling.
3. Uji fungsi murni dengan skrip sementara (jangan di-commit). Wajib benar:
   - `naturalCompare`: `["AGM-10","AGM-2","AGM-01","BIO-1",""]` terurut `AGM-01, AGM-2, AGM-10, BIO-1`, dan kosong paling bawah di asc maupun desc.
   - `buildPageList(1, 3)` = `[1,2,3]`; `buildPageList(5, 12)` = `[1,'…',4,5,6,'…',12]`; `buildPageList(1, 12)` = `[1,2,'…',12]`.
   - 120 buku, 10 per halaman: halaman 12 berisi nomor 111 sampai 120; halaman 13 dijepit ke 12.
   - Pencarian `agm 05` menemukan `AGM-05` dan **tidak** menemukan buku yang hanya cocok di ISBN atau nama kategori.
4. Jika `npm run dev` bisa dijalankan dengan Firebase, cek manual di lebar 375, 768, 1280 px: urutan tiap kolom, filter, pencarian, pagination, ganti tampilan, tombol Back dari detail (state harus kembali sama), ikon Edit membuka form ubah (pemilik), dan non-pemilik tidak melihat ikon Edit maupun form meski membuka `?ubah=1`. Jika tidak bisa (tanpa kredensial), katakan jelas di laporan bahwa bagian ini belum diuji di browser.
5. Cek lingkup (semua harus **kosong**):

```bash
git diff --stat -- composables/useBooks.ts composables/useCategories.ts composables/useAuth.ts \
  plugins middleware layouts firestore.rules package.json nuxt.config.ts \
  components/BookForm.vue components/IsbnScanner.vue components/BookCard.vue components/BookCover.vue \
  pages/rak.vue pages/kategori.vue pages/tambah.vue pages/masuk.vue
git diff -U0 -- 'pages/buku/[id].vue'   # hanya boleh memuat 3 perubahan + 1 watch dari bagian 7
```

---

## 9. Definisi selesai

- [ ] Tabel dengan kolom No, Kode, Judul, Pengarang, Kategori, Tgl Beli, Aksi (ikon Detail dan ikon Edit khusus pemilik)
- [ ] Urutan semua kolom kecuali No, bawaan Kode naik dengan natural sort, nilai kosong selalu di bawah
- [ ] Filter kategori (termasuk `Tanpa kategori`) dan pencarian Kode, Judul, Pengarang
- [ ] Pagination 10/25/50/100 (bawaan 10), nomor berlanjut antar halaman, reset ke halaman 1 saat filter berubah
- [ ] Tombol Tabel/Kartu, tabel bawaan, kartu memakai state yang sama
- [ ] State di URL, tombol Back dan "Kembali ke daftar" mengembalikan state yang sama
- [ ] Hasil uji fungsi murni (butir 3) dan cek lingkup (butir 5) dilampirkan di laporan
- [ ] `npx nuxt build` lolos, tidak ada dependency baru
- [ ] Laporan akhir berisi daftar file yang diubah, bagian mana yang sudah dan belum diuji di browser, serta **Saran untuk pemilik** (opsional)