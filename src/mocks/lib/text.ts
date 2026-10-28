/** Lowercase, accents removed: "Música" matches "musica". */
export const normalizeText = (value: string) =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export const slugify = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
