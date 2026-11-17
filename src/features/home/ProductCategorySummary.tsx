import type {
  ProductCategoryCounts,
} from "@/domains/inventur"

const CATEGORIES: Array<{
  key: keyof ProductCategoryCounts
  label: string
}> = [
  { key: "implantate", label: "Implantate" },
  { key: "siebe", label: "Siebe" },
  { key: "instrumente", label: "Instrumente" },
  { key: "weitere", label: "Weitere / ohne Zuordnung" },
]

type ProductCategorySummaryProps = {
  expected: ProductCategoryCounts
  found?: ProductCategoryCounts
  excludedOpenItems: number
}

const ProductCategorySummary = ({
  expected,
  found,
  excludedOpenItems,
}: ProductCategorySummaryProps) => (
  <section
    className="grid gap-2 border bg-muted/30 p-3"
    aria-label={found ? "Kategorie-Abgleich" : "Erwarteter Bestand nach Kategorie"}
  >
    <h2 className="text-[13px] font-bold">
      {found ? "Abgleich nach Produktkategorie" : "Erwarteter Bestand"}
    </h2>
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {CATEGORIES.map(({ key, label }) => {
        const target = expected[key]
        const actual = found?.[key]
        const difference = actual === undefined ? null : target - actual
        const progress =
          difference === null
            ? null
            : difference > 0
              ? `Noch ${difference} zu finden`
              : difference < 0
                ? `${Math.abs(difference)} mehr erfasst als erwartet`
                : "Ziel erreicht"

        return (
          <div key={key} className="min-w-0 border bg-background px-2.5 py-2">
            <dt className="truncate text-[11px] font-semibold text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1 text-[19px] font-bold tabular-nums leading-none">
              {found ? `${actual} / ${target}` : target}
            </dd>
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              {found ? "gefunden / erwartet" : "erwartet"}
            </p>
            {progress && (
              <p
                className={
                  difference === 0
                    ? "mt-1 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400"
                    : "mt-1 text-[10.5px] font-semibold text-amber-700 dark:text-amber-400"
                }
              >
                {progress}
              </p>
            )}
          </div>
        )
      })}
    </dl>
    <p className="text-[10.5px] text-muted-foreground">
      Offene Posten ausgeschlossen: {excludedOpenItems}{" "}
      {excludedOpenItems === 1 ? "Zeile" : "Zeilen"}.
    </p>
  </section>
)

export default ProductCategorySummary
