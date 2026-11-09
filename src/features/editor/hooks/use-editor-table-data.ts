import { useMemo, useState } from "react"
import {
  artNrAggregateRowsFromLotId,
  erpRowsForGrid,
  lotIdRowsForGrid,
  offenePostenRowsForGrid,
  rfidRowsForGrid,
  type EditorSnapshot,
} from "@/domains/inventur"

export const useEditorTableData = (snapshot: EditorSnapshot) => {
  const [lotIdData, setLotIdData] = useState(() =>
    lotIdRowsForGrid(snapshot.lot_id_rows)
  )
  const artNrData = useMemo(
    () => artNrAggregateRowsFromLotId(lotIdData),
    [lotIdData]
  )
  const [erpRows] = useState(() => erpRowsForGrid(snapshot.ax_bestand))
  const [rfidRows] = useState(() => rfidRowsForGrid(snapshot.rfid_scan))
  const [offenePostenRows] = useState(() =>
    offenePostenRowsForGrid(snapshot.offene_posten)
  )

  return {
    lotIdData,
    setLotIdData,
    artNrData,
    erpRows,
    rfidRows,
    offenePostenRows,
  }
}
