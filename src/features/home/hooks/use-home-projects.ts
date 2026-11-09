import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  deleteInventurProject,
  listInventurProjects,
  projectMetaToInventurFile,
  updateInventurTitle,
  type InventurFile,
  type ProjectMeta,
} from "@/domains/projects"

const isInventurjahr = (inventurDate: string, inventurjahr: string) =>
  inventurDate.startsWith(inventurjahr)

/** Current year, previous year, and every year that already has inventuren. */
export const buildInventurjahrOptions = (
  inventurDates: string[],
  currentYear = new Date().getFullYear()
): string[] => {
  const years = new Set<number>([currentYear, currentYear - 1])
  for (const date of inventurDates) {
    const year = Number(date.slice(0, 4))
    if (!Number.isFinite(year)) continue
    if (year < 2000 || year > currentYear + 1) continue
    years.add(year)
  }
  return [...years].sort((a, b) => b - a).map(String)
}

export const useHomeProjects = (inventurjahr: string) => {
  const [projects, setProjects] = useState<ProjectMeta[]>([])

  const availableYears = useMemo(
    () =>
      buildInventurjahrOptions(projects.map((project) => project.inventur_date)),
    [projects]
  )

  const yearProjects = useMemo(
    () => projects.filter((p) => isInventurjahr(p.inventur_date, inventurjahr)),
    [projects, inventurjahr]
  )

  const inventurFiles: InventurFile[] = useMemo(
    () => yearProjects.map(projectMetaToInventurFile),
    [yearProjects]
  )

  const insightCounts = useMemo(() => {
    const offene = yearProjects.filter((p) => p.status === "open").length
    const stichproben = yearProjects.reduce((sum, project) => {
      const done = Number(project.stichproben_done)
      const required = Number(project.stichproben_required)
      const completed = Number.isFinite(done) ? done : 0
      const target = Number.isFinite(required) ? required : 0
      return sum + Math.max(0, target - completed)
    }, 0)
    return {
      vergleiche: yearProjects.length,
      offene,
      stichproben,
    }
  }, [yearProjects])

  const refreshProjects = useCallback(async () => {
    try {
      const items = await listInventurProjects()
      setProjects(items)
    } catch (error) {
      console.error("Inventuren konnten nicht geladen werden:", error)
      setProjects([])
    }
  }, [])

  const handleRenameInventur = useCallback(
    async (id: string, title: string) => {
      try {
        await updateInventurTitle(id, title)
        await refreshProjects()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error)
        toast.error("Umbenennen fehlgeschlagen", { description: message })
      }
    },
    [refreshProjects]
  )

  const handleDeleteInventur = useCallback(
    async (id: string) => {
      try {
        await deleteInventurProject(id)
        await refreshProjects()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error)
        toast.error("Löschen fehlgeschlagen", { description: message })
      }
    },
    [refreshProjects]
  )

  return {
    projects,
    inventurFiles,
    availableYears,
    insightCounts,
    refreshProjects,
    handleRenameInventur,
    handleDeleteInventur,
  }
}
