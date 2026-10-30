# Perpustakaan Mini

Katalog perpustakaan pribadi: Nuxt 3 (mode SPA) + Firebase (Auth Google + Firestore). Bisa dilihat publik, hanya pemilik yang bisa mengubah.

## Fitur
- Daftar buku dengan pencarian dan filter kategori
- Tampilan rak: 2 rak x 15 kubus (5 baris x 3 kolom). Kategori kubus diambil dari buku di dalamnya, kubus kosong tidak punya kategori
- Tambah, ubah, hapus buku (khusus pemilik)
- Tambah lewat scan barcode ISBN (kamera) atau input manual
- Sampul: dari Google Books / Open Library, atau foto sendiri (dikecilkan otomatis dan disimpan sebagai base64 di dokumen Firestore)

Nomor kubus dihitung dari kiri atas: baris 1 = kubus 1 sampai 3, baris 2 = 4 sampai 6, dan seterusnya.

## Setup

1. **Firebase**: buat project di https://console.firebase.google.com
   - Build > Firestore Database > Create database (mode production)
   - Build > Authentication > Sign-in method > aktifkan **Google**
   - Project settings > Your apps > tambah **Web app**, salin `apiKey`, `authDomain`, `projectId`, `appId`
2. **Lokal**:
   ```bash
   npm install
   cp .env.example .env   # isi nilai Firebase
   npm run dev
   ```
3. **UID pemilik**: buka `/masuk`, login dengan Google. Karena `NUXT_PUBLIC_OWNER_UID` belum diisi, halaman akan menampilkan UID akunmu. Salin ke:
   - `.env` (`NUXT_PUBLIC_OWNER_UID`)
   - `firestore.rules` (ganti `GANTI_DENGAN_UID_KAMU`, 2 tempat)
4. **Aturan Firestore**: tempel isi `firestore.rules` di Firestore Database > Rules > Publish.
5. **Deploy ke Vercel**: import repo, isi 5 environment variable yang sama dengan `.env`. Lalu di Firebase > Authentication > Settings > Authorized domains, tambahkan domain Vercel-mu.

## Catatan
- `NUXT_PUBLIC_OWNER_UID` hanya menyembunyikan tombol. Yang benar-benar melindungi data adalah `firestore.rules`, jadi jangan lewati langkah 4.
- Scan kamera butuh HTTPS (otomatis di Vercel dan `localhost`).
- Buku Indonesia sering tidak ada di Google Books; kalau tidak ketemu, isi judul dan penulis manual.
