import type { InventurFile, ProjectMeta } from "@/domains/projects/types"

/** Relative / short German label from an ISO timestamp. */
const formatRelativeUpdatedAt = (iso: string): string => {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return iso
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return "gerade eben"
  if (mins < 60) return `vor ${mins} Min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours} Std`
  const days = Math.floor(hours / 24)
  if (days < 7) return `vor ${days} Tag${days === 1 ? "" : "en"}`
  return new Date(then).toLocaleDateString("de-DE")
}

/** Map project meta to inventuren hub card shape. */
export const projectMetaToInventurFile = (meta: ProjectMeta): InventurFile => ({
  id: meta.id,
  title: meta.title,
  debitor: meta.debitor,
  plz: meta.plz,
  ort: meta.ort,
  inventurDate: meta.inventur_date,
  formats: `${meta.stichproben_done}/${meta.stichproben_required}`,
  date: formatRelativeUpdatedAt(meta.updated_at),
  status: meta.status,
})
