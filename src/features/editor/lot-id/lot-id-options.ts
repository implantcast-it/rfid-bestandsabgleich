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
  "offener Posten",
]

export const STICHPROBE_OPTIONS = ["", "X"]

export const RFID_OPTIONS = ["0", "1"]

export const toSelectOptions = (values: string[], emptyLabel: string) =>
  values.map((value) => ({
    value,
    label: value || emptyLabel,
  }))
