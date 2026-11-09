import { useState } from "react"
import { toast } from "sonner"
import { exportBestaetigungPdf } from "@/domains/pdf"
import AppTopbar from "@/features/shell/AppTopbar"
import { BestaetigungFormDownload } from "@/features/home/BestaetigungFormDownload"

type HomeTopbarProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
  /** Called after a successful reference-catalog import so home gates refresh. */
  onCatalogChanged?: () => void
}

/** Home hub topbar — shared chrome with the editor. */
const HomeTopbar = ({
  searchQuery,
  onSearchChange,
  onCatalogChanged,
}: HomeTopbarProps) => {
  const [downloadingForm, setDownloadingForm] = useState(false)

  const handleDownloadBestaetigung = async () => {
    setDownloadingForm(true)
    try {
      const result = await exportBestaetigungPdf()
      if (result.cancelled) return
      if (!result.success) {
        toast.error("Download fehlgeschlagen", {
          description:
            result.error?.message ??
            "Das Bestätigungsformular konnte nicht erstellt werden.",
        })
        return
      }
      toast.success("Bestätigungsformular gespeichert", {
        description: result.filePath,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error("Download fehlgeschlagen", { description: message })
    } finally {
      setDownloadingForm(false)
    }
  }

  return (
    <AppTopbar
      variant="home"
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      onCatalogChanged={onCatalogChanged}
      settingsExtra={
        <BestaetigungFormDownload
          downloading={downloadingForm}
          onDownload={() => void handleDownloadBestaetigung()}
        />
      }
    />
  )
}

export default HomeTopbar
