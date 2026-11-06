import AppTopbar from "@/components/layout/AppTopbar"

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
}: HomeTopbarProps) => (
  <AppTopbar
    variant="home"
    searchQuery={searchQuery}
    onSearchChange={onSearchChange}
    onCatalogChanged={onCatalogChanged}
  />
)

export default HomeTopbar
