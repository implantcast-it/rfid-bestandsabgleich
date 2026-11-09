import { useState } from "react"
import { toast } from "sonner"
import {
  handleSnapshotExcelDownload,
  handleSnapshotPdfDownload,
} from "@/domains/export"
import type { EditorSnapshot, LotIdGridRow } from "@/domains/inventur"
import {
  updateInventurStatus,
  type ProjectStatus,
} from "@/domains/projects"
import {
  showToastInfo,
  type SetToastInfo,
} from "@/features/editor/toast-info"

type UseEditorExportArgs = {
  projectId: string
  lotIdData: LotIdGridRow[]
  buildLiveSnapshot: () => EditorSnapshot
  flushDraft: (opts?: { silent?: boolean }) => Promise<boolean>
  setProjectStatus: (status: ProjectStatus) => void
  assertStichprobenGate: (actionLabel: string) => boolean
}

export const useEditorExport = ({
  projectId,
  lotIdData,
  buildLiveSnapshot,
  flushDraft,
  setProjectStatus,
  assertStichprobenGate,
}: UseEditorExportArgs) => {
  const [exportPending, setExportPending] = useState<"excel" | "pdf" | null>(
    null
  )

  const runExport = async (
    kind: "excel" | "pdf",
    exportLabel: string,
    run: (setExportToast: SetToastInfo) => Promise<"success" | "cancelled" | "error">
  ) => {
    if (exportPending) return
    if (!assertStichprobenGate(`${exportLabel}-Export`)) return

    setExportPending(kind)
    const toastId = `editor-export-${kind}`
    toast.loading(`${exportLabel}-Export`, {
      id: toastId,
      description: "Speicherort wählen, danach wird die Datei erstellt…",
    })

    const setExportToast: SetToastInfo = (info) => {
      showToastInfo(info, { id: toastId })
    }

    try {
      const outcome = await run(setExportToast)
      if (outcome === "cancelled") {
        toast.dismiss(toastId)
        return
      }
      if (outcome !== "success") return

      await flushDraft({ silent: true })
      try {
        await updateInventurStatus(projectId, "exported")
        setProjectStatus("exported")
      } catch (error) {
        console.error("Status Exportiert konnte nicht gesetzt werden:", error)
      }
    } finally {
      setExportPending(null)
    }
  }

  const handleDownloadExcel = async () => {
    await runExport("excel", "Excel", async (setExportToast) => {
      const live = buildLiveSnapshot()
      return handleSnapshotExcelDownload(live, setExportToast)
    })
  }

  const handleDownloadPdf = async () => {
    await runExport("pdf", "PDF", async (setExportToast) => {
      const live = buildLiveSnapshot()
      return handleSnapshotPdfDownload(live, lotIdData, setExportToast)
    })
  }

  return {
    exportPending,
    handleDownloadExcel,
    handleDownloadPdf,
  }
}
