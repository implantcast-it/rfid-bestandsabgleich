import { cn } from "@/lib/utils"

const STATUS_OK =
  "bg-emerald-500/[0.08] text-emerald-700 dark:text-[#3dd68c]"
const STATUS_MISS =
  "bg-red-500/10 text-red-700 dark:text-[#ff9b9b]"
const STATUS_WARN =
  "bg-amber-500/10 text-amber-700 dark:text-[#f0c06a]"
const STATUS_TODO_EMPTY =
  "bg-violet-500/10 border border-violet-500/45 text-violet-700 dark:text-violet-400"

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

/** Sort comparator for Ablaufdatum values; unreadable dates sort first. */
export const sortAblaufdatum = (valueA: unknown, valueB: unknown): number =>
  (parseAblaufdatum(valueA)?.getTime() ?? 0) -
  (parseAblaufdatum(valueB)?.getTime() ?? 0)

export const formatAblaufdatum = (value: unknown): string => {
  const date = parseAblaufdatum(value)
  return date ? date.toLocaleDateString("de-DE") : "-"
}

export const expiryCellClass = (value: unknown): string => {
  const date = parseAblaufdatum(value)
  if (!date) return ""

  const now = new Date()
  if (date < now) return STATUS_MISS

  const inThreeMonths = new Date()
  inThreeMonths.setMonth(inThreeMonths.getMonth() + 3)
  if (date < inThreeMonths) return STATUS_WARN

  return ""
}

export const erpRfidCompareClass = (
  erpValue: unknown,
  rfidValue: unknown,
  side: "erp" | "rfid"
): string => {
  const erp = Number(erpValue)
  const rfid = Number(rfidValue)

  if (side === "erp") {
    if (erp === 0 && rfid === 1) return STATUS_WARN
    if (erp === 1 && rfid === 0) return STATUS_MISS
    if (erp === 1 && rfid === 1) return STATUS_OK
    return ""
  }

  if (rfid === 0 && erp === 1) return STATUS_MISS
  if (rfid === 1 && erp === 0) return STATUS_WARN
  if (rfid === 1 && erp === 1) return STATUS_OK
  return ""
}

export const differenzCellClass = (value: unknown): string => {
  const num = Number(value)
  if (Number.isNaN(num)) return ""
  if (num === 0) return STATUS_OK
  if (num < 0) return STATUS_WARN
  return STATUS_MISS
}

export const emptyTodoDiffClass = (
  todoValue: unknown,
  erpValue: unknown,
  rfidValue: unknown
): string => {
  const hasDifference = String(rfidValue) !== String(erpValue)
  const isEmpty = !todoValue || String(todoValue).trim() === ""
  return hasDifference && isEmpty ? STATUS_TODO_EMPTY : ""
}

export const cellStatusClass = (...classes: Array<string | false | null | undefined>) =>
  cn(...classes)

export const EXPIRY_TOOLTIP =
  "GELB: Datum läuft bald ab - ROT: Datum ist abgelaufen"
