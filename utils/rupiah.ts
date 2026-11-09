/**
 * Utilitas format dan parsing mata uang Rupiah
 */

/**
 * Mengambil angka murni dari string input (misal "Rp 1.250.000" -> 1250000).
 * Mengembalikan null jika kosong atau tanpa digit.
 * Dibatasi maksimal 12 digit.
 */
export const parseRupiah = (input: string): number | null => {
  if (!input) return null
  const cleaned = input.replace(/\D/g, '').slice(0, 12)
  if (!cleaned) return null
  const num = Number(cleaned)
  return Number.isSafeInteger(num) ? num : null
}

/**
 * Format angka ke format mata uang Rupiah penuh (contoh: Rp 125.000).
 */
export const formatRupiah = (n: number | null | undefined): string => {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)
}

/**
 * Format angka ke pemisah ribuan id-ID (contoh: 125.000).
 */
export const formatAngka = (n: number | null | undefined): string => {
  if (n === null || n === undefined || !Number.isFinite(n)) return ''
  return new Intl.NumberFormat('id-ID').format(n)
}
