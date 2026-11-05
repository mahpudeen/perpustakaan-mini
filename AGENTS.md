# AGENTS.md: Upgrade tampilan dan navbar Perpustakaan Mini

Tugasmu: membuat tampilan Perpustakaan Mini terlihat **modern, rapi, dan terasa seperti perpustakaan pribadi**, termasuk navbar baru. Ini pekerjaan **tampilan saja**. Logic CRUD, Firebase, auth, routing, dan data tidak boleh berubah sama sekali.

Keputusan desain sudah diambil di dokumen ini. Ikuti, jangan bertanya soal selera.

---

## 1. Aturan utama

### Boleh diubah
- `assets/main.css` (boleh ditulis ulang total)
- Bagian `<template>` di semua `.vue`: tambah wrapper `div`, `span`, `class`, atribut `aria-*`, `:style` yang murni visual, dan SVG inline
- Komponen baru yang murni presentasi, misalnya `components/icons/*.vue`, `components/ui/*.vue`
- `layouts/default.vue`: boleh menambah **state UI murni** di `<script setup>` (contoh: `const scrolled = ref(false)` untuk bayangan navbar). Fungsi yang sudah ada (`leave`, dll.) dan pemakaian `useAuth()` tidak boleh diubah
- `nuxt.config.ts`: hanya boleh menambah `app.pageTransition` / `app.layoutTransition`

### Dilarang disentuh
- Folder `composables/`, `utils/`, `plugins/`, `middleware/`
- `firestore.rules`, `.env*`, `package.json` (tidak ada dependency baru, ikon pakai SVG inline)
- Semua blok `<script setup>` selain pengecualian `layouts/default.vue` di atas
- Di dalam `<template>`, jangan ubah atau hapus: `v-model`, `@click`, `@submit`, `@change`, `@keydown`, `@detected`, `@close`, `:to`, `:disabled`, `:key`, props dan emit antar komponen, kondisi `v-if` / `v-else-if` / `v-else` yang sudah ada (terutama yang memakai `isOwner`, `user`, `loaded`, `error`, `editing`), serta path route
- Jangan mengubah teks/copy bahasa Indonesia kecuali terpaksa untuk layout, dan makna tidak boleh berubah
- Jangan menambah data baru ke komponen (misalnya nama kategori di `BookCard`), karena itu butuh perubahan script

Fitur yang **butuh logic** dan karena itu **tidak dikerjakan** di tugas ini: navbar search global, tombol tema gelap manual, bottom sheet yang menutup saat klik backdrop, auto-scroll saat kubus dipilih. Kalau menurutmu ada yang layak ditambah, tulis di bagian "Saran untuk pemilik" pada laporan akhir. Jangan dikerjakan.

### Kalau ragu
Jika sebuah desain ternyata butuh perubahan logic, **jangan lakukan**. Pilih versi CSS-only, atau lewati dan catat di laporan.

---

## 2. Peta project

| File | Fungsi |
|---|---|
| `layouts/default.vue` | Header dan navbar, slot halaman |
| `pages/index.vue` | Daftar buku, pencarian, chip kategori |
| `pages/rak.vue` | Tampilan 2 rak, 15 kubus per rak (5 baris x 3 kolom), panel isi kubus |
| `pages/kategori.vue` | Daftar kategori, form tambah, ubah nama, hapus |
| `pages/buku/[id].vue` | Detail buku, mode ubah memakai `BookForm` |
| `pages/tambah.vue`, `pages/masuk.vue` | Tambah buku, login Google |
| `components/BookCard.vue`, `BookCover.vue` | Kartu buku, sampul (dengan fallback warna) |
| `components/BookForm.vue`, `IsbnScanner.vue` | Form buku, scan barcode lewat kamera |
| `assets/main.css` | Seluruh styling saat ini (CSS biasa, tanpa Tailwind) |

Class CSS yang ada boleh diganti nama, asal template dan CSS tetap konsisten.

---

## 3. Arah desain

**Karakter:** katalog pribadi yang tenang dan hangat. Permukaan bersih dan lega, dengan satu elemen yang punya karakter: **rak kayu oak bergaya kubus**. Bukan dashboard SaaS, bukan tampilan toko buku online.

**Yang harus terasa:** modern, bersih, padat informasi tanpa sesak, nyaman di HP (pemilik memakai kamera HP untuk scan buku).

**Hindari:** gradient ungu atau biru-ungu, glassmorphism berlebihan, bayangan tebal, border tebal di semua tempat, emoji sebagai ikon, semua elemen rata tengah, warna neon.

### 3.1 Token warna (taruh di `:root`)

```css
:root {
  --bg: #f3f4f1;
  --surface: #ffffff;
  --surface-2: #eceeea;
  --ink: #14211f;
  --ink-2: #4e5c59;
  --line: #dde1dc;

  --accent: #0b7a66;        /* hijau teal, tombol utama dan link aktif */
  --accent-ink: #ffffff;
  --accent-soft: #d7efe8;

  --oak: #b98a5b;           /* kayu rak */
  --oak-light: #d2a878;
  --oak-deep: #8b6238;

  --danger: #b3261e;
  --warn-bg: #fbeee0;
  --warn-ink: #7a3b00;

  --radius-sm: 8px;
  --radius: 14px;
  --radius-lg: 20px;
  --shadow-1: 0 1px 2px rgb(20 33 31 / 0.06), 0 1px 1px rgb(20 33 31 / 0.04);
  --shadow-2: 0 10px 28px rgb(20 33 31 / 0.12);
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  --serif: 'Newsreader', Georgia, serif;
  --sans: 'Instrument Sans', system-ui, sans-serif;
  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1716;
    --surface: #16211f;
    --surface-2: #1d2b28;
    --ink: #eaf1ee;
    --ink-2: #9db0ab;
    --line: #2a3a36;
    --accent: #3cc9ae;
    --accent-ink: #06211b;
    --accent-soft: #143a33;
    --oak: #a97c4f;
    --oak-light: #c29563;
    --oak-deep: #6f4d2b;
    --warn-bg: #3a2a16;
    --warn-ink: #f3cfa1;
    --shadow-1: 0 1px 2px rgb(0 0 0 / 0.4);
    --shadow-2: 0 10px 28px rgb(0 0 0 / 0.45);
  }
}
```

Tema gelap hanya mengikuti pengaturan sistem (`prefers-color-scheme`), tanpa tombol manual. Pastikan **kedua mode** dicek.

### 3.2 Tipografi
- Font sudah dimuat di `nuxt.config.ts` (Newsreader dan Instrument Sans). **Jangan ganti.**
- Newsreader untuk judul halaman, judul buku, nama kategori. Instrument Sans untuk UI, label, tombol.
- Skala: h1 `clamp(2rem, 5vw, 3rem)`, h2 `1.4rem`, teks `1rem/1.55`, keterangan `0.85rem`.
- Angka (jumlah buku, nomor kubus) pakai `font-variant-numeric: tabular-nums`.

### 3.3 Bentuk dan gerak
- Radius kartu dan panel `--radius`, tombol dan input `--radius-sm`, chip `999px`.
- Transisi 150 sampai 250 ms dengan `--ease`. Hover kartu: naik 3 sampai 4 px dan bayangan menguat.
- Wajib menghormati `prefers-reduced-motion: reduce` (matikan transform dan animasi).
- Transisi antar halaman: fade singkat 150 ms lewat `app.pageTransition` di `nuxt.config.ts`.

---

## 4. Navbar (`layouts/default.vue`)

Pertahankan semua link, kondisi `v-if="isOwner"` / `v-if="user"`, dan handler `leave` apa adanya. Yang berubah hanya markup pembungkus dan styling.

**Desktop (>= 768 px)**
```
[logo] Perpustakaan Mini      Daftar buku   Rak   Kategori        [+ Tambah buku]  Keluar
```
- Sticky di atas, tinggi 64 px, latar `color-mix(in srgb, var(--bg) 82%, transparent)` dengan `backdrop-filter: blur(12px)`, garis bawah `--line`. Setelah halaman di-scroll (state UI `scrolled`), tambahkan `--shadow-1`.
- Logo: ikon SVG inline kecil berupa 3 punggung buku tegak dengan tinggi berbeda (warna `--oak`, `--accent`, `--oak-deep`), diikuti nama "Perpustakaan Mini" dalam Newsreader 1.25rem.
- Link: ikon SVG 18 px + teks. Status aktif (`router-link-exact-active`) berupa pill `--accent-soft` dengan teks `--accent`, bukan sekadar garis bawah. Link non-aktif `--ink-2`, saat hover `--ink`.
- "Tambah buku" (hanya pemilik): tombol terisi `--accent`, ikon plus. "Masuk" / "Keluar": tombol ghost kecil di ujung kanan.

**Mobile (< 768 px)**
- Top bar tipis (56 px): logo dan "Masuk" / "Keluar" di kanan.
- **Bottom tab bar** tetap di bawah layar: Daftar buku, Rak, Kategori, dan "Tambah" (hanya pemilik, dibuat menonjol dengan warna aksen). Tiap tab: ikon di atas, label kecil di bawah, tinggi sentuh minimal 48 px.
- Beri `padding-bottom: calc(72px + env(safe-area-inset-bottom))` pada `.main` supaya konten tidak tertutup.
- Gunakan `env(safe-area-inset-top/bottom)` (viewport sudah mendukung).

Sediakan ikon sebagai komponen SVG inline di `components/icons/` (stroke 1.75, `currentColor`, ukuran lewat prop atau CSS): daftar, rak (grid 3x3), kategori (tag), tambah (plus), masuk/keluar, kosong (buku).

---

## 5. Per halaman

### Daftar buku (`pages/index.vue`)
- Header ringkas: judul, kalimat jumlah buku, lalu **kolom pencarian besar** (tinggi 48 px, ikon kaca pembesar di dalam input lewat pembungkus + CSS, tanpa mengubah `v-model`).
- Chip kategori satu baris yang bisa di-scroll horizontal di HP (`overflow-x: auto`, sembunyikan scrollbar), chip aktif memakai `--ink` terisi atau `--accent`.
- Grid kartu: min 150 px di HP (2 kolom), 180 px di desktop. Sampul besar dengan `--shadow-1`, efek tepi buku (garis terang tipis di sisi kiri), judul maksimal 2 baris, penulis kecil, lokasi dalam pill kecil dengan ikon kubus.
- State memuat: tampilkan **skeleton kartu** (kotak abu berdenyut halus) pada cabang `!loaded`. State kosong: ikon buku, teks yang sudah ada, ruang lega.

### Rak (`pages/rak.vue`), halaman andalan
- Setiap rak tampil sebagai **furnitur oak**: bingkai `linear-gradient(145deg, var(--oak-light), var(--oak))`, radius 6 px, padding 10 px, jarak antar kubus 10 px, bayangan bawah `--oak-deep`.
- Isi kubus memakai `--surface-2` dengan inset shadow atas dan kiri supaya terlihat berongga. Tidak ada border individual.
- Punggung buku (`.spines i`) diberi radius atas 2 px dan overlay gradient tipis agar terlihat bervolume. Saat kubus di-hover, punggung buku naik 2 sampai 3 px.
- Label kubus: nama kategori dalam Newsreader, jumlah buku sebagai pill kecil, nomor kubus di pojok dengan angka tabular. Kubus kosong: teks miring pudar, tanpa nama kategori.
- Kubus terpilih: ring `--accent` 3 px dan `scale(1.02)`.
- Panel isi kubus (`.drawer`) menjadi kartu `--surface` dengan radius `--radius`, animasi muncul (fade + geser 8 px). Bagian "Belum ditempatkan" memakai gaya serupa tapi lebih redup.
- Dua rak berdampingan di layar >= 900 px, bertumpuk di bawahnya. Pastikan kubus tetap bisa disentuh nyaman di layar 360 px.

### Kategori (`pages/kategori.vue`)
- Form tambah sebagai satu baris input + tombol di atas (tetap hanya tampil untuk pemilik).
- Daftar menjadi **grid kartu** 1 sampai 3 kolom: titik warna kecil dari `hueFor(c.name)` (fungsi util yang sudah ada, dipakai hanya untuk tampilan), nama dalam Newsreader, jumlah buku sebagai pill, tombol Ubah nama dan Hapus yang tenang (ghost, hapus berwarna `--danger` saat hover). Tombol Hapus yang `disabled` harus terlihat jelas nonaktif.
- Mode ubah nama (form inline) mengisi kartu penuh, tombol sejajar.

### Detail buku (`pages/buku/[id].vue`)
- Dua kolom di desktop: sampul besar dengan `--shadow-2` dan efek tepi buku, di kanan judul (Newsreader besar), penulis miring, lalu fakta (letak, kategori, kode, ISBN, tanggal) dalam kartu `--surface` dengan baris berpemisah tipis.
- Tombol Ubah dan Hapus sejajar. Di HP, baris tombol boleh `position: sticky` di atas bottom tab bar.

### Form tambah dan ubah (`components/BookForm.vue`, `pages/tambah.vue`)
- Tiap `form-block` menjadi kartu `--surface` dengan judul seksi kecil dan nomor langkah (1 Cari lewat ISBN, 2 Data buku, 3 Letak di rak, 4 Sampul), hanya dekorasi CSS atau teks statis di template.
- Input tinggi 46 px, label di atas, fokus dengan ring `--accent`. Peringatan (`.hint.warn`) memakai `--warn-bg`.
- Tombol "Scan barcode" menonjol (terisi aksen). `IsbnScanner` boleh ditata jadi **panel layar penuh di HP memakai CSS saja** (`position: fixed; inset: 0`), dengan bingkai pemindai (kotak sudut) di atas video. Jangan mengubah event `detected` dan `close`.
- Tombol "Simpan" lebar penuh dan sticky di bawah pada HP.

### Masuk (`pages/masuk.vue`)
Kartu tengah sederhana. Tombol Google dengan ikon G inline. Kotak UID tetap dipertahankan dan mudah disalin.

---

## 6. Aksesibilitas dan kualitas

- Kontras teks minimal WCAG AA di mode terang dan gelap.
- `:focus-visible` jelas di semua elemen interaktif (ring `--accent`, offset 2 px).
- Target sentuh minimal 44 x 44 px.
- Pertahankan semua `aria-label`, `aria-pressed`, `role` yang sudah ada. Ikon dekoratif diberi `aria-hidden="true"`.
- Tidak ada scroll horizontal di halaman pada lebar 360 px.
- Gambar dan skeleton tidak boleh menyebabkan layout bergeser (jaga `aspect-ratio`).

---

## 7. Cara kerja

1. Sebelum mulai: `git init` (jika belum), `git add -A && git commit -m "baseline"`, lalu pastikan `npm install && npx nuxt build` lolos.
2. Urutan kerja: token dan CSS dasar, `layouts/default.vue` (navbar), `index`, `rak`, `kategori`, detail, form dan scanner, `masuk`.
3. Setelah setiap langkah: `npx nuxt build` harus lolos.
4. **Cek bahwa logic tidak berubah** (harus tidak mencetak apa pun):

```bash
# 1) folder dan file terlarang
git diff --stat -- composables utils plugins middleware firestore.rules package.json .env.example

# 2) blok <script> setiap .vue tidak berubah
for f in $(git ls-files '*.vue'); do
  diff <(git show HEAD:"$f" | awk '/<script/{p=1} p{print} /<\/script>/{p=0}') \
       <(awk '/<script/{p=1} p{print} /<\/script>/{p=0}' "$f") >/dev/null \
    || echo "SCRIPT BERUBAH: $f"
done
```
   Satu-satunya yang boleh muncul: `layouts/default.vue` (state UI murni yang ditambahkan). Jelaskan penambahannya di laporan.
5. Cek manual di lebar **375, 768, 1280 px**, mode terang dan gelap, plus navigasi dengan keyboard (Tab).
6. Kalau bisa, jalankan `npm run dev` dan periksa tiap halaman: `/`, `/rak`, `/kategori`, `/buku/<id>`, `/tambah`, `/masuk`. Halaman admin butuh login pemilik, jadi cukup pastikan build lolos dan markup-nya benar bila tidak bisa login.

---

## 8. Definisi selesai

- [ ] Navbar baru: desktop (sticky, blur, pill aktif) dan mobile (top bar + bottom tab bar)
- [ ] Semua halaman di bagian 5 sudah dirapikan, mode terang dan gelap
- [ ] `npx nuxt build` lolos tanpa error baru
- [ ] Cek logic (langkah 4) bersih, kecuali state UI di `layouts/default.vue`
- [ ] Tidak ada dependency baru
- [ ] Laporan akhir berisi: daftar file yang diubah, hasil cek logic, hal yang sengaja tidak dikerjakan karena butuh logic, dan **Saran untuk pemilik** (opsional)