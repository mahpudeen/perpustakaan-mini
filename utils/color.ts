const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
export const hueFor = (s: string) => hash(s || '?') % 360
export const spineHeight = (s: string) => 58 + (hash((s || '?') + 'h') % 34) // persen
export const spineWidth = (s: string) => 7 + (hash((s || '?') + 'w') % 6) // px
