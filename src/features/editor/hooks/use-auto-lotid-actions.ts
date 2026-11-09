import { useCallback, type SetStateAction } from "react"
import {
  applyAutoLotIdRows,
  autoFillKommentare,
  autoSiebe,
  lotIdGridToCompareRows,
  type LotIdGridRow,
} from "@/domains/inventur"
import { showToastInfo } from "@/features/editor/toast-info"

type UseAutoLotIdActionsArgs = {
  lotIdData: LotIdGridRow[]
  onLotIdChange: (update: SetStateAction<LotIdGridRow[]>) => void
}

export const useAutoLotIdActions = ({
  lotIdData,
  onLotIdChange,
}: UseAutoLotIdActionsArgs) => {
  const handleAutoFillKommentare = useCallback(async () => {
    try {
      const result = await autoFillKommentare(lotIdGridToCompareRows(lotIdData))
      if (result.changed_count <= 0) {
        showToastInfo({
          open: true,
          type: "error",
          title: "Keine passenden Paare gefunden",
          description: "Keine passenden Paare zum Kommentieren gefunden.",
        })
        return
      }

      onLotIdChange((prev) => applyAutoLotIdRows(prev, result.rows))
      showToastInfo({
        open: true,
        type: "success",
        title: "Kommentare automatisch ausgefüllt",
        description: `${[...new Set(result.affected_artikelnummern)].length} Artikelnummer(n) automatisch kommentiert.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      showToastInfo({
        open: true,
        type: "error",
        title: "Auto-Kommentare fehlgeschlagen",
        description: message,
      })
    }
  }, [lotIdData, onLotIdChange])

  const handleAutoSiebe = useCallback(async () => {
    try {
      const result = await autoSiebe(lotIdGridToCompareRows(lotIdData))
      if (result.sieb_inst_row_count <= 0) {
        showToastInfo({
          open: true,
          type: "error",
          title: "Keine Aktionen ausgeführt",
          description: "Keine Zeilen für 'SIEB' oder 'INST' gefunden.",
        })
        return
      }

      onLotIdChange((prev) => applyAutoLotIdRows(prev, result.rows))
      showToastInfo({
        open: true,
        type: "success",
        title: "Aktionen ausgeführt",
        description: `${result.sieb_inst_row_count} 'SIEB/INST' Zeile(n) aktualisiert.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      showToastInfo({
        open: true,
        type: "error",
        title: "Auto SIEB/INST fehlgeschlagen",
        description: message,
      })
    }
  }, [lotIdData, onLotIdChange])

  return { handleAutoFillKommentare, handleAutoSiebe }
}
