import {
  parseAblaufdatum,
  toAblaufdatumTimestamp,
} from "@/lib/ablaufdatum"

const STATUS_OK =
  "bg-emerald-500/[0.08] text-emerald-700 dark:text-[#3dd68c]"
const STATUS_MISS =
  "bg-red-500/10 text-red-700 dark:text-[#ff9b9b]"
const STATUS_WARN =
  "bg-amber-500/10 text-amber-700 dark:text-[#f0c06a]"
const STATUS_TODO_EMPTY =
  "bg-violet-500/10 border border-violet-500/45 text-violet-700 dark:text-violet-400"

/** Sort comparator for Ablaufdatum values; unreadable dates sort first. */
export const sortAblaufdatum = (valueA: unknown, valueB: unknown): number =>
  toAblaufdatumTimestamp(valueA) - toAblaufdatumTimestamp(valueB)

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

export const EXPIRY_TOOLTIP =
  "GELB: Datum läuft bald ab - ROT: Datum ist abgelaufen"
