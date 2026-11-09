import { open } from "@tauri-apps/plugin-dialog"
import { cn } from "@/core/utils"

type DropSlotProps = {
  title: string
  acceptLabel: string
  description: string
  extensions: string[]
  filePath?: string
  required?: boolean
  onSelect: (path: string | null) => void
}

const fileName = (path?: string) => {
  if (!path) return null
  return path.replace(/^.*[\\/]/, "")
}

const DropSlot = ({
  title,
  acceptLabel,
  description,
  extensions,
  filePath,
  required = true,
  onSelect,
}: DropSlotProps) => {
  const name = fileName(filePath)
  const ready = Boolean(name)

  const handlePick = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: acceptLabel, extensions }],
      })
      if (selected && !Array.isArray(selected)) {
        onSelect(selected)
      }
    } catch (error) {
      console.error("Dateidialog fehlgeschlagen:", error)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      void handlePick()
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handlePick()}
      onKeyDown={handleKeyDown}
      data-dropzone-id={title}
      className={cn(
        "focus-visible:ring-ring grid min-h-24 grid-rows-[auto_1fr_auto] gap-2 border-[1.5px] border-dashed p-3 text-left transition outline-none focus-visible:ring-2",
        ready
          ? "border-primary/50 bg-primary/10 dark:border-[#2f5f58] dark:bg-[#15201e]"
          : "border-border bg-muted/40 hover:border-primary hover:bg-primary/5 dark:bg-[#171717]"
      )}
      aria-label={`${title} auswählen`}
      tabIndex={0}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-[13px] font-bold tracking-[-0.01em]">{title}</span>
        <span
          className={cn(
            "rounded-full px-2 py-1 text-[11px] font-bold leading-none",
            ready
              ? "bg-emerald-500/15 text-emerald-700 dark:bg-[rgba(61,214,140,0.14)] dark:text-[#3dd68c]"
              : required
                ? "bg-amber-500/15 text-amber-700 dark:bg-[rgba(224,162,58,0.16)] dark:text-[#f0c06a]"
                : "bg-muted text-muted-foreground"
          )}
        >
          {ready ? "Bereit" : required ? "Fehlt" : "Optional"}
        </span>
      </div>
      <span
        className={cn(
          "self-center text-[12.5px] leading-snug",
          ready
            ? "text-primary dark:text-[#c8e6e1]"
            : "text-muted-foreground"
        )}
      >
        {ready ? (
          <>
            <strong className="text-foreground font-semibold dark:text-[#ddd]">
              {name}
            </strong>
            <br />
            erneut wählen zum Ersetzen
          </>
        ) : (
          <>
            Klicken zum Auswählen.
            <br />
            <strong className="text-foreground/80 font-semibold dark:text-[#ddd]">
              {description}
            </strong>
            {" · "}
            {acceptLabel === "Excel" ? "tagesaktueller Abzug" : "Geräteexport"}
          </>
        )}
      </span>
      <span className="text-muted-foreground text-[11px] font-semibold">
        {ready ? "Ausgewählt" : required ? "Pflicht" : "Optional"}
      </span>
    </button>
  )
}

export default DropSlot
