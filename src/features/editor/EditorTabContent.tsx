import type { ReactNode } from "react"
import ArtNrTable from "@/features/editor/tables/ArtNrTable"
import ErpTable from "@/features/editor/tables/ErpTable"
import LotIdTable from "@/features/editor/tables/LotIdTable"
import OffenePostenTable from "@/features/editor/tables/OffenePostenTable"
import RfidTable from "@/features/editor/tables/RfidTable"
import type { ArtNrAggregateRow, LotIdGridRow } from "@/domains/inventur"
import type { LotIdStatusFilter } from "@/domains/inventur/search"

type EditorTabContentProps = {
  activeTab: string
  deferredSearchQuery: string
  lotIdData: LotIdGridRow[]
  artNrData: ArtNrAggregateRow[]
  erpRows: Record<string, unknown>[]
  rfidRows: Record<string, unknown>[]
  offenePostenRows: Record<string, unknown>[]
  lotIdStatusFilter: LotIdStatusFilter
  isBulkEditOpen: boolean
  onBulkEditOpenChange: (open: boolean) => void
  onLotIdChange: (
    data: LotIdGridRow[] | ((prev: LotIdGridRow[]) => LotIdGridRow[])
  ) => void
}

export const EditorTabContent = ({
  activeTab,
  deferredSearchQuery,
  lotIdData,
  artNrData,
  erpRows,
  rfidRows,
  offenePostenRows,
  lotIdStatusFilter,
  isBulkEditOpen,
  onBulkEditOpenChange,
  onLotIdChange,
}: EditorTabContentProps): ReactNode => {
  switch (activeTab) {
    case "erp":
      return <ErpTable data={erpRows} globalFilter={deferredSearchQuery} />
    case "offenePosten":
      return (
        <OffenePostenTable
          data={offenePostenRows}
          globalFilter={deferredSearchQuery}
        />
      )
    case "rfid":
      return (
        <RfidTable data={rfidRows} globalFilter={deferredSearchQuery} />
      )
    case "lotId":
      return (
        <LotIdTable
          data={lotIdData}
          globalFilter={deferredSearchQuery}
          statusFilter={lotIdStatusFilter}
          isBulkEditOpen={isBulkEditOpen}
          onBulkEditOpenChange={onBulkEditOpenChange}
          onChange={onLotIdChange}
        />
      )
    case "artikelNr":
      return (
        <ArtNrTable data={artNrData} globalFilter={deferredSearchQuery} />
      )
    default:
      return (
        <div>
          Fehler: Keine Daten gefunden - du befindest dich auf der falschen
          Seite! Wähle eine Seite aus dem Menü.
        </div>
      )
  }
}
