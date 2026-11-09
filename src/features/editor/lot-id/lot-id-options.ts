export const TODO_OPTIONS = [
  "",
  "berechnen + liefern",
  "interne Berechnung",
  "interne Gutschrift mit Rückbuchung auf Konsi",
  "NUR berechnen",
  "NUR liefern auf Konsi",
  "Resteriaustausch",
  "über Gutschrift ins Konsi buchen",
  "Storno / offener Posten",
]

export const ANMERKUNG_OPTIONS = [
  "",
  "AWS",
  "bereits unterwegs",
  "Ersatzartikel",
  "Fremdprodukt",
  "geht zurück",
  "in Klärung",
  "INST liegt auf Sieb",
  "Kaufware",
  "kein RFID Chip",
  "Klinik bestellt",
  "Mitnahme",
  "nicht scanbar / Lot korrekt",
]

export const STICHPROBE_OPTIONS = ["", "X"]

export const RFID_OPTIONS = ["0", "1"]

export const toSelectOptions = (values: string[], emptyLabel: string) =>
  values.map((value) => ({
    value,
    label: value || emptyLabel,
  }))

export const RFID_SELECT_OPTIONS = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
]

export const TODO_SELECT_OPTIONS = toSelectOptions(TODO_OPTIONS, "—")
export const ANMERKUNG_SELECT_OPTIONS = toSelectOptions(ANMERKUNG_OPTIONS, "—")
export const STICHPROBE_SELECT_OPTIONS = toSelectOptions(
  STICHPROBE_OPTIONS,
  "—"
)
export const BULK_TODO_OPTIONS = toSelectOptions(TODO_OPTIONS, "--- Leeren ---")
export const BULK_ANMERKUNG_OPTIONS = toSelectOptions(
  ANMERKUNG_OPTIONS,
  "--- Leeren ---"
)
export const BULK_RFID_OPTIONS = [
  { value: "", label: "--- Auswählen ---" },
  { value: "0", label: "0" },
  { value: "1", label: "1" },
]
