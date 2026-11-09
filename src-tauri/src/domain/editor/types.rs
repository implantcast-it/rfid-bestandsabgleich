//! Editor session DTOs shared with the frontend via serde.

use serde::{Deserialize, Serialize};

use crate::domain::types::{
    ArtNrCompareRow, ErpRow, LotIdCompareRow, OffenePostenRow, RfidRow,
};

/// Editable LotId columns only (TanStack cell editors map 1:1).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LotIdEditField {
    /// Presence flag `"0"` | `"1"`.
    RfidScan,
    /// Controlled vocabulary ([`TODO_OPTIONS`](crate::domain::editor::vocabulary::TODO_OPTIONS)).
    ToDo,
    /// Controlled vocabulary ([`ANMERKUNG_OPTIONS`](crate::domain::editor::vocabulary::ANMERKUNG_OPTIONS)).
    Anmerkung,
    /// `""` | `"X"`.
    Stichprobe,
}

/// Partial update for one LotId row, keyed by stable [`LotIdCompareRow::id`].
///
/// ERP presence (`erp`) is intentionally absent — read-only.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct LotIdPatch {
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rfid_scan: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub to_do: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub anmerkung: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stichprobe: Option<String>,
}

impl LotIdPatch {
    pub(crate) fn has_any_field(&self) -> bool {
        self.rfid_scan.is_some()
            || self.to_do.is_some()
            || self.anmerkung.is_some()
            || self.stichprobe.is_some()
    }
}

/// Mini-stats for editor chrome (badges / toasts).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EditorStats {
    /// LotId rows where ERP presence ≠ RFID presence.
    pub abweichungen: u32,
    /// LotId rows with empty To Do.
    pub offene_todos: u32,
    /// Rows with Stichprobe completed (`X`).
    pub stichproben_done: u32,
    /// Mandatory quota: ceil(1% of [`Self::erp_quantity_total`]).
    #[serde(default)]
    pub stichproben_required: u32,
    /// Sum of Ax-Bestand ERP quantities (guideline for the 1% rule).
    #[serde(default)]
    pub erp_quantity_total: u32,
}

/// Full UI payload: one JSON object later returned by a Tauri command.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EditorSnapshot {
    pub debitor: String,
    pub kundenname: String,
    pub lot_id_rows: Vec<LotIdCompareRow>,
    pub art_nr_rows: Vec<ArtNrCompareRow>,
    pub ax_bestand: Vec<ErpRow>,
    pub rfid_scan: Vec<RfidRow>,
    /// Offene Posten, shown on their own tab. Missing in drafts saved before this field existed.
    #[serde(default)]
    pub offene_posten: Vec<OffenePostenRow>,
    pub dirty: bool,
    pub edited_ids: Vec<String>,
    pub stats: EditorStats,
}
