import type { LotIdStatusFilter } from "@/domains/inventur/search"
import LotIdStatusChips from "@/features/editor/LotIdStatusChips"
import MiniStats, { type AutosaveStatus } from "@/features/editor/MiniStats"

type LotIdStatsHeaderProps = {
  abweichungen: number
  offeneTodos: number
  stichprobenDone: number
  stichprobenRequired: number
  autosaveStatus: AutosaveStatus
  autosaveCountdown: string
  lotIdStatusFilter: LotIdStatusFilter
  onStatusFilterChange: (value: LotIdStatusFilter) => void
}

const LotIdStatsHeader = ({
  abweichungen,
  offeneTodos,
  stichprobenDone,
  stichprobenRequired,
  autosaveStatus,
  autosaveCountdown,
  lotIdStatusFilter,
  onStatusFilterChange,
}: LotIdStatsHeaderProps) => (
  <div className="flex flex-col gap-2">
    <MiniStats
      abweichungen={abweichungen}
      stichprobe={`${stichprobenDone}/${stichprobenRequired}`}
      offeneTodos={offeneTodos}
      autosaveStatus={autosaveStatus}
      autosaveCountdown={autosaveCountdown}
      activeStatusFilter={lotIdStatusFilter}
      onStatusFilterChange={onStatusFilterChange}
    />
    <LotIdStatusChips
      value={lotIdStatusFilter}
      onChange={onStatusFilterChange}
    />
  </div>
)

export default LotIdStatsHeader
