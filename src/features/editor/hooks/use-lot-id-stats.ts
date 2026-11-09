import { useMemo } from "react"
import {
  isStichprobenComplete,
  stichprobenRequiredFromErpTotal,
  sumErpQuantityTotal,
  type EditorSnapshot,
  type LotIdGridRow,
} from "@/domains/inventur"
import {
  isLotIdAbweichung,
  isLotIdOffenerTodo,
} from "@/domains/inventur/search"

export const useLotIdStats = (
  lotIdData: LotIdGridRow[],
  axBestand: EditorSnapshot["ax_bestand"]
) => {
  const lotIdStats = useMemo(() => {
    let abweichungen = 0
    let offeneTodos = 0
    let stichprobenDone = 0
    for (const row of lotIdData) {
      if (isLotIdAbweichung(row)) abweichungen += 1
      if (isLotIdOffenerTodo(row)) offeneTodos += 1
      if (String(row["Stichprobe"] ?? "").trim().toUpperCase() === "X") {
        stichprobenDone += 1
      }
    }
    return { abweichungen, offeneTodos, stichprobenDone }
  }, [lotIdData])

  const stichprobenRequired = useMemo(
    () => stichprobenRequiredFromErpTotal(sumErpQuantityTotal(axBestand)),
    [axBestand]
  )

  const stichprobenDone = lotIdStats.stichprobenDone
  const stichprobenMet = isStichprobenComplete(
    stichprobenDone,
    stichprobenRequired
  )

  return {
    lotIdStats,
    stichprobenRequired,
    stichprobenDone,
    stichprobenMet,
  }
}
