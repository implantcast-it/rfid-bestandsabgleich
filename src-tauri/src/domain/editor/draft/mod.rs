//! Inventur editing session: LotId is source of truth → derive ArtNr → export.
//!
//! ## Hard rules
//!
//! 1. Only LotId editable fields may be patched (`rfid_scan`, `to_do`, `anmerkung`, `stichprobe`).
//! 2. ArtNr is always [`aggregate_art_nr_from_lot_id`] — never patched by the UI.
//! 3. Row identity is [`LotIdCompareRow::id`] (TanStack `getRowId`).
//! 4. Ephemeral UI state (`edited_ids`, selection) lives on the draft, not in Excel.
//! 5. Raw `ax_bestand` / `rfid_scan` sheets pass through unchanged.
//!
//! ```text
//! CompareResult ──from_compare──► InventurDraft
//!                                      │
//!                      apply_patches / bulk_set / auto_*
//!                                      │
//!                              snapshot() ──► TanStack tables
//!                                      │
//!                           to_export_result() ──► write_abgleich_xlsx
//! ```
//!
//! | Module | Role |
//! |--------|------|
//! | [`patch`] | `apply_patches` / `bulk_set` |
//! | [`auto`] | Auto-Kommentare / Auto-SIEB bookkeeping |
//! | [`export`] | CompareResult projection + xlsx writers |

mod auto;
mod export;
mod patch;

#[cfg(test)]
mod fixtures;
#[cfg(test)]
mod tests;

use std::collections::HashSet;

use crate::domain::editor::aggregate::aggregate_art_nr_from_lot_id;
use crate::domain::editor::stats::compute_stats;
use crate::domain::editor::types::{EditorSnapshot, EditorStats};
use crate::domain::types::{
    ArtNrCompareRow, CompareResult, ErpRow, LotIdCompareRow, OffenePostenRow, RfidRow,
};

/// Mutable inventur session after compare (or Abgleich reload).
///
/// LotId rows are private; mutate only via [`Self::apply_patches`], [`Self::bulk_set`],
/// or auto-action methods so ArtNr stays derived and validation stays centralized.
#[derive(Debug, Clone)]
pub struct InventurDraft {
    pub debitor: String,
    pub kundenname: String,
    pub ax_bestand: Vec<ErpRow>,
    pub rfid_scan: Vec<RfidRow>,
    lot_id_rows: Vec<LotIdCompareRow>,
    offene_posten: Vec<OffenePostenRow>,
    edited_ids: HashSet<String>,
    dirty: bool,
}

impl InventurDraft {
    /// Build a draft from a compare/reload result.
    ///
    /// Inventur-time ArtNr (row counts) is **ignored**; editor ArtNr is always
    /// re-derived from LotId presence flags.
    pub fn from_compare(result: CompareResult) -> Self {
        Self {
            debitor: result.debitor,
            kundenname: result.kundenname,
            ax_bestand: result.ax_bestand,
            rfid_scan: result.rfid_scan,
            lot_id_rows: result.bestandsabgleich_lot_id,
            offene_posten: result.offene_posten,
            edited_ids: HashSet::new(),
            dirty: false,
        }
    }

    /// Resume a draft from a UI / project [`EditorSnapshot`].
    ///
    /// Snapshot ArtNr rows are ignored; export re-aggregates from LotId.
    pub fn from_snapshot(snapshot: EditorSnapshot) -> Self {
        let mut draft = Self::from_compare(CompareResult {
            debitor: snapshot.debitor,
            kundenname: snapshot.kundenname,
            ax_bestand: snapshot.ax_bestand,
            rfid_scan: snapshot.rfid_scan,
            bestandsabgleich_artikelnummer: snapshot.art_nr_rows,
            bestandsabgleich_lot_id: snapshot.lot_id_rows,
            offene_posten: snapshot.offene_posten,
        });
        draft.edited_ids = snapshot.edited_ids.into_iter().collect();
        draft.dirty = snapshot.dirty;
        draft
    }

    pub fn lot_id_rows(&self) -> &[LotIdCompareRow] {
        &self.lot_id_rows
    }

    /// Offene Posten: read-only, never edited and not part of the stats.
    pub fn offene_posten(&self) -> &[OffenePostenRow] {
        &self.offene_posten
    }

    /// Derived ArtNr aggregation (sum of LotId presence flags).
    pub fn art_nr_rows(&self) -> Vec<ArtNrCompareRow> {
        aggregate_art_nr_from_lot_id(&self.lot_id_rows)
    }

    pub fn is_dirty(&self) -> bool {
        self.dirty
    }

    pub fn edited_ids(&self) -> &HashSet<String> {
        &self.edited_ids
    }

    pub fn stats(&self) -> EditorStats {
        compute_stats(&self.lot_id_rows, &self.ax_bestand)
    }

    /// Snapshot for TanStack tables / future Tauri command payload.
    pub fn snapshot(&self) -> EditorSnapshot {
        let mut edited: Vec<String> = self.edited_ids.iter().cloned().collect();
        edited.sort();
        EditorSnapshot {
            debitor: self.debitor.clone(),
            kundenname: self.kundenname.clone(),
            lot_id_rows: self.lot_id_rows.clone(),
            art_nr_rows: self.art_nr_rows(),
            ax_bestand: self.ax_bestand.clone(),
            rfid_scan: self.rfid_scan.clone(),
            offene_posten: self.offene_posten.clone(),
            dirty: self.dirty,
            edited_ids: edited,
            stats: self.stats(),
        }
    }
}
