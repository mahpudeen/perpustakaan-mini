# AGENTS-harga.md: Harga beli dan dashboard pengeluaran

Tugasmu: menambah **harga beli** (opsional) pada **buku** dan **action figure**, menampilkannya di tabel dan detail, lalu membuat **halaman dashboard pengeluaran** yang hanya bisa dibuka pemilik. Tujuannya sederhana: tahu berapa uang yang sudah dikeluarkan untuk buku dan figure.

Semua keputusan di dokumen ini sudah final. Ikuti, jangan bertanya soal pilihan yang sudah tertulis. Tugas ini **mengubah kode buku dan figure yang sudah ada**, tetapi hanya di file yang disebut di bagian 1 dan hanya dengan menambah (jangan mengubah perilaku yang sudah ada).

---

## 1. Lingkup

### Dibuat baru
- `utils/rupiah.ts` (`parseRupiah`, `formatRupiah`)
- `utils/spending.ts` (fungsi murni untuk total dan pengelompokan)
- `components/ui/PriceInput.vue`
- `pages/pengeluaran.vue`

### Diubah (hanya menambah)
- `composables/useBooks.ts` dan `composables/useFigures.ts`: tambahkan `price` ke tipe, dan normalisasi di snapshot (`price: data.price ?? null`). Fungsi lain tidak diubah
- `components/BookForm.vue` dan `components/FigureForm.vue`: tambah satu field Harga (bagian 3)
- Tabel daftar buku (`pages/index.vue` atau komponen tabelnya) dan tabel figure (`pages/figure/index.vue`): kolom Harga, urutan, filter (bagian 4)
- `utils/bookTable.ts` dan `utils/figureTable.ts`: tambahkan dukungan urutan dan filter harga bila fungsi urut/filter ada di sana
- Halaman detail `pages/buku/[id].vue` dan `pages/figure/[id].vue`: tampilkan harga (bagian 5)
- Impor JSON buku dan figure **bila sudah ada**: terima kunci `price` (bagian 6)
- `layouts/default.vue`: satu link "Pengeluaran" khusus pemilik
- `firestore.rules`: validasi `price` di blok `books` dan `figures`
- `assets/main.css` (tambah di akhir) dan `README.md` (satu baris fitur)

Cek dulu isi repo (`ls pages pages/figure components composables utils`) karena sebagian fitur sebelumnya (tabel, figure, impor) mungkin belum ada atau berbeda nama. Sesuaikan dengan kondisi sebenarnya, jangan membuat ulang fitur yang sudah ada.

### Dilarang disentuh
`pages/rak.vue`, `pages/kategori.vue`, `pages/tambah.vue`, `pages/figure/tambah.vue`, `pages/masuk.vue`, `components/BookCard.vue`, `BookCover.vue`, `IsbnScanner.vue`, `composables/useAuth.ts`, `useCategories.ts`, `plugins/`, `middleware/`, `package.json`, `nuxt.config.ts`. Tidak ada dependency baru (grafik dibuat dengan HTML/CSS biasa). Boleh **memakai** `useAuth()`, `useCategories()`, dan `middleware: 'owner'`, tanpa mengubahnya.

---

## 2. Data

Tambahkan field **`price`** di dokumen `books` dan `figures`:

| Field | Tipe | Keterangan |
|---|---|---|
| `price` | bilangan bulat `>= 0` atau `null` | harga beli dalam **Rupiah penuh** (tanpa sen), opsional. `0` sah (hadiah, gratis). Kosong disimpan `null` |

- Dokumen lama **tidak punya** field ini. Anggap `undefined` sama dengan `null`, tidak perlu migrasi. Normalisasi di snapshot supaya seluruh kode lain cukup membaca `price` bertipe `number | null`.
- Tipe: `Book` dan `Figure` mendapat `price: number | null`. `BookInput` dan `FigureInput` mengikuti (otomatis lewat `Omit`).
- Harga tiap item **terlihat semua pengunjung** (keputusan pemilik). Hanya **total dan dashboard** yang khusus pemilik. Catat di laporan akhir: karena harga tiap item publik, orang lain secara teknis bisa menjumlahkannya sendiri; dashboard khusus pemilik hanya menyembunyikan ringkasannya di aplikasi, bukan menyembunyikan data.

---

## 3. Input harga

### `utils/rupiah.ts`
- `parseRupiah(input: string): number | null`: ambil hanya angka (`"Rp 1.250.000"` menjadi `1250000`), kosong atau tanpa angka menjadi `null`, `"0"` menjadi `0`. Batasi maksimal 12 digit.
- `formatRupiah(n: number): string`: `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`, contoh `Rp 125.000`.
- `formatAngka(n: number): string`: `new Intl.NumberFormat('id-ID').format(n)` untuk isi input (`125.000`).

### `components/ui/PriceInput.vue`
- Props: `modelValue: number | null`, `id: string`. Emit: `update:modelValue`. Dipakai dengan `v-model="form.price"`.
- Satu kontrol: input teks dengan awalan `Rp` di dalam kolom (wrapper `position: relative`, awalan di kiri, `padding-left` secukupnya), `inputmode="numeric"`, `autocomplete="off"`, `placeholder="0"`.
- Saat mengetik: buang semua selain angka, emit `number | null`, tampilkan angka dengan pemisah ribuan (`125.000`). Kursor boleh melompat ke akhir. Tinggi, radius, border, dan ring fokus sama dengan `.input` lain.
- Teks bantu di form: `Opsional. Kosongkan bila belum diketahui.`

### Di form
- Tambahkan field **Harga** setelah Tgl beli di `BookForm.vue` dan `FigureForm.vue`: `<label class="field"><span>Harga</span><PriceInput v-model="form.price" id="..." /></label>`.
- Nilai awal dari `props.initial?.price ?? null`. Saat submit kirim `price: form.price` (angka bulat atau `null`). Tidak ada validasi yang memblokir simpan karena harga kosong.
- Data lama dilengkapi lewat **form ubah satu per satu** (tidak ada halaman isi cepat).

---

## 4. Tabel daftar (buku dan figure)

- Tambahkan kolom **Harga** setelah Tgl Beli. Rata kanan, `font-variant-numeric: tabular-nums`, format `formatRupiah`, kosong tampil `-` pudar. Terlihat oleh semua pengunjung.
- **Urutan**: kunci `harga`. Urut numerik. **Nilai kosong selalu di paling bawah**, baik naik maupun turun (sama seperti kolom lain). Tambahkan `harga` ke daftar nilai `urut` yang valid di URL.
- **Filter harga**: dropdown `Harga: Semua` (bawaan), `Sudah diisi`, `Belum diisi`. Kunci URL `harga` dengan nilai `isi` atau `kosong`, dihilangkan dari URL bila `Semua`. Bekerja bersama filter, pencarian, dan urutan yang sudah ada, dan kembali ke halaman 1 saat berubah. Ini dipakai untuk menemukan item yang harganya belum diisi.
- Tabel yang belum berbentuk seperti itu (misalnya masih kartu) tidak perlu diubah, cukup sesuaikan dengan kondisi repo dan tulis di laporan.

---

## 5. Halaman detail

Pada `pages/buku/[id].vue` dan `pages/figure/[id].vue`, tambahkan baris **Harga** di daftar fakta (hanya bila `price !== null`), format `formatRupiah`. Tidak ada perubahan pada logika simpan, hapus, atau mode ubah.

---

## 6. Impor JSON (hanya bila sudah ada)

Bila impor JSON untuk buku dan/atau figure sudah ada di repo, tambahkan kunci opsional `price` (bilangan bulat `>= 0`):
- Nilai bukan bilangan bulat atau negatif: baris ditandai tidak valid dengan alasan `harga harus bilangan bulat >= 0`.
- Kolom Harga tampil di tabel pratinjau.
- Mekanisme lain tidak berubah. Bila impor belum ada, lewati bagian ini.

---

## 7. Dashboard `pages/pengeluaran.vue`

`definePageMeta({ middleware: 'owner' })`. Link "Pengeluaran" di `layouts/default.vue` hanya muncul bila `isOwner` (pakai pola link navigasi yang sudah ada, termasuk tab bar mobile bila ada). Non-pemilik yang membuka `/pengeluaran` dialihkan ke `/masuk` oleh middleware yang sudah ada.

Data: `useBooks()`, `useFigures()`, `useCategories()`. Semua dihitung di browser. **Hanya item yang punya harga (`price !== null`) yang dijumlahkan.**

### Bagian 1: kartu total
Tiga kartu: **Total gabungan** (paling besar), **Buku**, **Action figure**. Angka memakai `formatRupiah` dalam Newsreader besar, dengan tabular-nums. Di bawah tiap kartu buku dan figure: `N item berharga dari M` dan, bila ada yang kosong, link `X belum ada harga` ke `/?harga=kosong` (buku) atau `/figure?harga=kosong` (figure). Kartu gabungan memuat rata-rata per item berharga.

### Bagian 2: per tahun beli
- Kelompokkan berdasarkan 4 digit pertama `purchaseDate`. Item berharga tanpa tanggal masuk kelompok `Tanpa tanggal beli`.
- Urut kronologis naik, `Tanpa tanggal beli` paling akhir.
- Tabel: Tahun, Buku, Figure, Total. Di atas atau di samping tabel, **bar bertumpuk** per tahun dengan HTML/CSS biasa (div dengan lebar persentase terhadap tahun terbesar): segmen buku memakai `--accent`, segmen figure memakai `--oak`, dengan legenda teks (jangan hanya warna). Bar bersifat dekoratif (`aria-hidden="true"`), nilai sebenarnya ada di tabel.

### Bagian 3: per kategori (buku)
Kelompokkan buku berharga menurut `categoryId` dengan nama dari `nameOf`; yang tanpa kategori masuk `Tanpa kategori`. Tabel: Kategori, Jumlah buku berharga, Total, Porsi (%) dengan batang tipis. Urut dari total terbesar.

### Bagian 4: per anime (figure)
Kelompokkan figure berharga menurut `anime`, **tanpa peka huruf besar/kecil** (gunakan `uniqueAnime`/`canonicalAnime` dari `utils/figure.ts` bila ada, agar `one piece` dan `One Piece` satu kelompok); kosong masuk `Tanpa anime`. Kolom sama dengan bagian 3. Urut dari total terbesar.

### Keadaan khusus
- Skeleton saat data belum selesai dimuat (`!loaded` pada buku atau figure), pesan peringatan bila `error`.
- Bila belum ada satu pun harga: `Belum ada harga yang diisi. Isi harga lewat form ubah buku atau figure.` dengan link ke `/` dan `/figure`.
- Tabel dibungkus container `overflow-x: auto`. Tidak ada scroll horizontal halaman di 360 px. Mode terang dan gelap harus terbaca.
- Semantik: tiap tabel punya `<caption class="sr-only">`, `<th scope="col">`; kartu total memakai heading.

### Fungsi murni (`utils/spending.ts`)
Semua tanpa Vue dan tanpa Firebase, mudah diuji:
- `sumPrices(items)` menjumlahkan `price` yang berupa angka valid (abaikan `null`, `undefined`, `NaN`)
- `countPriced(items)`
- `yearOf(purchaseDate)` mengembalikan `'2024'` atau `null` bila tanggal kosong atau tidak valid
- `groupByYear(books, figures)` mengembalikan baris `{ label, buku, figure, total, countBuku, countFigure }` terurut sesuai aturan di atas
- `groupByCategory(books, nameOf)` dan `groupByAnime(figures)` mengembalikan baris `{ label, count, total, share }` terurut dari total terbesar; `share` adalah persen terhadap total seluruh kelompok

---

## 8. Aturan Firestore

Di blok `books` dan blok `figures`, tambahkan satu kondisi pada aturan `create, update` (jangan mengubah kondisi lain, dan jangan mengubah UID yang sudah ada):

```
&& (!('price' in request.resource.data)
    || request.resource.data.price == null
    || (request.resource.data.price is int
        && request.resource.data.price >= 0
        && request.resource.data.price <= 100000000000))
```

Beri tahu pemilik di laporan akhir bahwa rules harus **ditempel ulang dan dipublikasikan** di konsol Firebase, kalau tidak, menyimpan harga akan ditolak.

---

## 9. Cara kerja dan verifikasi

1. Sebelum mulai: `git init` (bila belum), `git add -A && git commit -m "baseline"`, pastikan `npm install && npx nuxt build` lolos.
2. Urutan kerja: `utils/rupiah.ts`, `PriceInput`, tipe dan snapshot di composable, field di dua form, kolom/urutan/filter di tabel, detail, impor (bila ada), `utils/spending.ts`, dashboard, link navbar, rules, styling.
3. Uji fungsi murni dengan skrip sementara (jangan di-commit). Wajib benar:
   - `parseRupiah("125.000")` = 125000; `"Rp 1.500.000"` = 1500000; `""` = `null`; `"abc"` = `null`; `"0"` = 0.
   - `formatRupiah(125000)` menghasilkan `Rp 125.000` (abaikan perbedaan spasi tak terputus).
   - `sumPrices([{price: 100}, {price: null}, {}, {price: 50}])` = 150.
   - `groupByYear` dengan buku `[{price:100000, purchaseDate:'2024-03-01'}, {price:null, purchaseDate:'2024-05-01'}, {price:50000, purchaseDate:''}]` dan figure `[{price:200000, purchaseDate:'2025-01-10'}]` menghasilkan baris `2024` (buku 100000, 1 item), `2025` (figure 200000), `Tanpa tanggal beli` (buku 50000), dalam urutan itu.
   - `groupByAnime` dengan `["One Piece","one piece","Naruto"]` menghasilkan dua kelompok, bukan tiga.
   - Urutan harga di tabel: `[300, null, 100]` naik menjadi `100, 300, null`; turun menjadi `300, 100, null`.
4. Bila `npm run dev` bisa dijalankan dengan Firebase, cek manual di lebar 375, 768, 1280 px: tambah dan ubah buku/figure dengan dan tanpa harga; harga muncul di tabel dan detail untuk pengunjung biasa; dashboard hanya terbuka untuk pemilik dan angkanya cocok dengan perhitungan tangan; filter `Belum diisi` menemukan item tanpa harga. Bila tidak bisa (tanpa kredensial), nyatakan jelas di laporan bagian mana yang belum diuji di browser.
5. Cek lingkup (harus **kosong**):

```bash
git diff --stat -- pages/rak.vue pages/kategori.vue pages/tambah.vue pages/figure/tambah.vue pages/masuk.vue \
  components/BookCard.vue components/BookCover.vue components/IsbnScanner.vue \
  composables/useAuth.ts composables/useCategories.ts plugins middleware package.json nuxt.config.ts
```

---

## 10. Definisi selesai

- [ ] Field `price` opsional di buku dan figure, input harga rapi (`PriceInput`, format ribuan), data lama bisa diisi lewat form ubah
- [ ] Kolom Harga di tabel buku dan figure, bisa diurutkan (kosong selalu di bawah), filter `Sudah diisi`/`Belum diisi`, state di URL
- [ ] Harga tampil di halaman detail dan (bila ada) diterima impor JSON
- [ ] Dashboard `/pengeluaran` khusus pemilik: total gabungan/buku/figure, per tahun beli, per kategori, per anime, state kosong dan skeleton
- [ ] Link "Pengeluaran" di navbar hanya untuk pemilik
- [ ] Aturan Firestore memvalidasi `price`
- [ ] Fungsi murni lolos uji (butir 3), cek lingkup bersih (butir 5), `npx nuxt build` lolos, tidak ada dependency baru
- [ ] Laporan akhir berisi daftar file yang diubah atau dibuat, bagian yang sudah dan belum diuji di browser, pengingat menempel ulang rules, catatan bahwa harga tiap item publik sehingga dashboard hanya menyembunyikan ringkasan, serta **Saran untuk pemilik** (opsional)