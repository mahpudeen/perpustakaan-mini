import type { Book } from '~/composables/useBooks'

/**
 * Escapes a field for CSV format according to RFC 4180.
 * Wraps in double quotes if it contains commas, newlines, or quotes.
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Ekspor data buku ke file CSV untuk pencadangan atau pendataan spreadsheet.
 */
export function exportBooksToCsv(
  books: Book[],
  getCategoryName: (book: Book) => string = (b) => b.category || '',
): void {
  if (!books || !books.length) return

  const headers = [
    'No',
    'Kode',
    'Judul',
    'Pengarang',
    'Kategori',
    'Rak',
    'Kubus',
    'Tanggal Beli',
    'ISBN',
    'Sinopsis',
  ]

  const rows = books.map((b, index) => [
    index + 1,
    b.code || '',
    b.title || '',
    b.author || '',
    getCategoryName(b) || '',
    b.shelf ? `Rak ${b.shelf}` : '',
    b.cube ? `Kubus ${b.cube}` : '',
    b.purchaseDate || '',
    b.isbn || '',
    b.synopsis || '',
  ])

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\r\n')

  // Tambahkan \uFEFF (UTF-8 BOM) agar aplikasi seperti Microsoft Excel otomatis membuka dengan UTF-8
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const filename = `perpustakaan-mini-koleksi-${dateStr}.csv`

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
