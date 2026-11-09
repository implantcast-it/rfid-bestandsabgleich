//! Controlled vocabularies for LotId editor fields (Logistik parity).
//!
//! Source: `documentation/data-model-and-rules.md`. Keep strings exact.

/// To Do assigned to ERP-present / RFID-missing lots by Auto-Kommentare.
pub const TODO_INTERNE_BERECHNUNG: &str = "interne Berechnung";

/// To Do assigned to ERP-missing / RFID-extra lots by Auto-Kommentare.
pub const TODO_INTERNE_GUTSCHRIFT: &str =
    "interne Gutschrift mit Rückbuchung auf Konsi";

/// Full To Do select list (including empty).
pub const TODO_OPTIONS: &[&str] = &[
    "",
    "berechnen + liefern",
    TODO_INTERNE_BERECHNUNG,
    TODO_INTERNE_GUTSCHRIFT,
    "NUR berechnen",
    "NUR liefern auf Konsi",
    "Resteriaustausch",
    "über Gutschrift ins Konsi buchen",
    "Storno / offener Posten",
];

/// Full Anmerkung select list (including empty).
///
/// Offene Posten are ERP sheet rows (ordered, not on site) — not an Anmerkung.
pub const ANMERKUNG_OPTIONS: &[&str] = &[
    "",
    "AWS",
    "bereits unterwegs",
    "Ersatzartikel",
    "geht zurück",
    "in Klärung",
    "Kaufware",
    "kein RFID Chip",
    "Klinik bestellt",
    "Mitnahme",
    "nicht scanbar / Lot korrekt",
];

/// Stichprobe completed marker (case-insensitive check in UI).
pub const STICHPROBE_DONE: &str = "X";
