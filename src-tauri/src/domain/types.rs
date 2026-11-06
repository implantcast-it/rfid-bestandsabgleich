//! Typed row contracts for inventur import and comparison outputs.
//!
//! Field names and sheet names match the v4 Excel export so Logistik tooling
//! continues to work. Serde derives prepare these DTOs for future Tauri commands.
//! Barcode / scan-compare sheets are not part of this engine.

use serde::{Deserialize, Serialize};

/// Product fields looked up from the Master GTIN catalog.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProductInfo {
    pub artikelnummer: String,
    pub produktname: String,
    /// Category used for LotId sort (`IMP` / `INST` / `SIEB` / other).
    pub kennzeichen_3: String,
}

/// One ERP stock line after rename of `Physischer Bestand`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ErpRow {
    pub artikelnummer: String,
    pub produktname: String,
    pub lot_id: String,
    pub kennzeichen_3: String,
    pub ablaufdatum: String,
    pub debitorenkonto: String,
    /// Renamed from `Physischer Bestand`; not used for ArtNr math (row counts only).
    pub eigenbestand_nach_erp: String,
    /// Extra ERP columns preserved for the `Ax-Bestand` sheet (header → value).
    #[serde(default)]
    pub extra: Vec<(String, String)>,
}

/// Enriched, LotId-deduped RFID scan row.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RfidRow {
    pub gtin: String,
    pub lot_id: String,
    pub kennung_1: String,
    pub debitorennummer: String,
    pub erfasst_um: String,
    pub artikelnummer: String,
    pub produktname: String,
    pub kennzeichen_3: String,
}

/// Artikelnummer aggregation: counts **rows**, not ERP quantity values.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ArtNrCompareRow {
    pub artikelnummer: String,
    pub produktname: String,
    pub eigenbestand_nach_erp: i64,
    pub rfid_scan: i64,
    /// `eigenbestand_nach_erp - rfid_scan`
    pub differenz: i64,
    pub id: String,
}

/// Lot-level reconciliation. Presence flags are the strings `"1"` / `"0"`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LotIdCompareRow {
    pub artikelnummer: String,
    pub produktname: String,
    pub kennzeichen_3: String,
    pub lot_id: String,
    pub eigenbestand_nach_erp: String,
    pub rfid_scan: String,
    pub ablaufdatum: String,
    pub to_do: String,
    pub anmerkung: String,
    pub stichprobe: String,
    pub id: String,
    pub index: u32,
}

/// Offene Posten: ERP row whose `Insgesamt bestellt` cell holds a number.
///
/// Ordered but not on site. Kept out of the Abgleich and shown separately.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OffenePostenRow {
    pub artikelnummer: String,
    pub produktname: String,
    pub lot_id: String,
    /// `Ablaufdatum` from the ERP row, shown as MHD.
    pub ablaufdatum: String,
    /// Count from `Insgesamt bestellt`; integer text when whole.
    pub offen: String,
    pub id: String,
}

/// Inputs already parsed/normalized for [`crate::domain::compare::run_compare`].
#[derive(Debug, Clone)]
pub struct CompareInput {
    pub erp: Vec<ErpRow>,
    pub rfid: Vec<RfidRow>,
    pub debitor: String,
    /// Resolved Kundenname from Debitor catalog; `"Unbekannt"` if missing.
    pub kundenname: String,
    /// Open positions split off the ERP sheet; passed through, never compared.
    pub offene_posten: Vec<OffenePostenRow>,
}

/// Full reconciliation result ready for editor DTOs or Excel export.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CompareResult {
    pub debitor: String,
    pub kundenname: String,
    pub ax_bestand: Vec<ErpRow>,
    pub rfid_scan: Vec<RfidRow>,
    pub bestandsabgleich_artikelnummer: Vec<ArtNrCompareRow>,
    pub bestandsabgleich_lot_id: Vec<LotIdCompareRow>,
    /// Offene Posten, outside the Abgleich. Empty for Abgleich files saved before this sheet existed.
    #[serde(default)]
    pub offene_posten: Vec<OffenePostenRow>,
}

/// Fixed Excel sheet names — must stay stable for Logistik parity.
pub mod sheet_names {
    pub const AX_BESTAND: &str = "Ax-Bestand";
    pub const RFID_SCAN: &str = "RFID-Scan";
    pub const BESTANDSABGLEICH_ARTIKELNUMMER: &str = "Bestandsabgleich Artikelnummer";
    pub const BESTANDSABGLEICH_LOT_ID: &str = "Bestandsabgleich LotId";
    pub const OFFENE_POSTEN: &str = "Offene Posten";
}

/// Sentinel used when GTIN / product fields cannot be resolved.
pub const UNBEKANNT: &str = "Unbekannt";
