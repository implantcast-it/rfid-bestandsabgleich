import { useState } from "react"
import { toast } from "sonner"
import {
  formatImportSummary,
  getCatalogStats,
  importReferenceCatalogFromDialog,
  type CatalogStats,
} from "@/domains/catalog"

export const useCatalogSettings = (onCatalogChanged?: () => void) => {
  const [catalogStats, setCatalogStats] = useState<CatalogStats | null>(null)
  const [importing, setImporting] = useState(false)

  const refreshCatalogStats = async () => {
    try {
      const stats = await getCatalogStats()
      setCatalogStats(stats)
    } catch (error) {
      console.error("Katalog-Statistik konnte nicht geladen werden:", error)
      setCatalogStats(null)
    }
  }

  const handleImportCatalog = async () => {
    setImporting(true)
    try {
      const stats = await importReferenceCatalogFromDialog()
      if (!stats) return
      toast.success("Referenzkatalog importiert", {
        description: formatImportSummary(stats),
      })
      await refreshCatalogStats()
      onCatalogChanged?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error("Import fehlgeschlagen", { description: message })
    } finally {
      setImporting(false)
    }
  }

  return {
    catalogStats,
    importing,
    refreshCatalogStats,
    handleImportCatalog,
  }
}
