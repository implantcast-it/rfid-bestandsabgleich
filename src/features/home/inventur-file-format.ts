import type { FileStatus, InventurFile } from "@/domains/projects"
import { normalizeSearchText } from "@/domains/inventur/search"

export const statusLabel: Record<FileStatus, string> = {
  open: "Offen",
  exported: "Exportiert",
  done: "Fertig",
}

export const statusBadgeClass: Record<FileStatus, string> = {
  open: "text-[#8aaba6]",
  exported: "text-[#8a9bb0]",
  done: "text-[#8aa894]",
}

/** Format ISO date as German `dd.mm.yyyy`. */
export const formatInventurDateDe = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-")
  if (!year || !month || !day) return isoDate
  return `${day}.${month}.${year}`
}

const inventurYear = (isoDate: string) => isoDate.slice(0, 4)

export const formatLocation = (file: InventurFile) => {
  const plz = file.plz.trim()
  const ort = file.ort.trim()
  if (plz && ort) return `${plz} ${ort}`
  return plz || ort
}

export const formatFileAriaLabel = (file: InventurFile, action?: "open") => {
  const parts = [
    action === "open" ? `${file.title} öffnen` : file.title,
    `Status ${statusLabel[file.status]}`,
  ]
  const location = formatLocation(file)
  if (location) parts.push(location)
  if (file.debitor.trim()) parts.push(`Debitor ${file.debitor.trim()}`)
  if (file.inventurDate) {
    parts.push(`Inventur ${formatInventurDateDe(file.inventurDate)}`)
  }
  return parts.join(", ")
}

export const matchesInventurSearch = (file: InventurFile, rawQuery: string) => {
  const query = normalizeSearchText(rawQuery)
  if (!query) return true

  const dateDe = formatInventurDateDe(file.inventurDate)
  const year = inventurYear(file.inventurDate)

  const fields = [
    file.title,
    file.debitor,
    file.plz,
    file.ort,
    dateDe,
    year,
    "Stichprobe",
    file.formats,
    statusLabel[file.status],
  ]

  return fields.some((field) => normalizeSearchText(field).includes(query))
}
