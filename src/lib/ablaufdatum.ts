/** Local calendar date, or `null` when that day does not exist (e.g. 31.02.). */
const localDate = (
  year: number,
  monthIndex: number,
  day: number
): Date | null => {
  const date = new Date(year, monthIndex, day)
  const isSameDay =
    date.getFullYear() === year &&
    date.getMonth() === monthIndex &&
    date.getDate() === day
  return isSameDay ? date : null
}

/** Excel day serial (1900 date system) → local calendar date. */
const excelSerialToLocalDate = (serial: number): Date | null => {
  const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000)
  return localDate(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate())
}

/**
 * Read an Ablaufdatum cell: German `dd.mm.yyyy` (ERP export format),
 * ISO `yyyy-mm-dd`, or a raw Excel serial kept by drafts saved before dates
 * were formatted. Other text falls back to `Date` parsing.
 */
export const parseAblaufdatum = (value: unknown): Date | null => {
  const text = String(value ?? "").trim()
  if (text === "") return null

  const german = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\b/.exec(text)
  if (german) {
    return localDate(Number(german[3]), Number(german[2]) - 1, Number(german[1]))
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})\b/.exec(text)
  if (iso) {
    return localDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  }

  if (/^\d{5}$/.test(text)) {
    return excelSerialToLocalDate(Number(text))
  }

  const fallback = new Date(text)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

/** Comparable timestamp for an Ablaufdatum cell; unreadable dates map to 0 (sort first). */
export const toAblaufdatumTimestamp = (value: unknown): number =>
  parseAblaufdatum(value)?.getTime() ?? 0
