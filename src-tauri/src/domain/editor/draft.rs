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

use std::collections::{HashMap, HashSet};
use std::path::Path;

use crate::domain::editor::aggregate::aggregate_art_nr_from_lot_id;
use crate::domain::editor::auto_kommentare::{auto_fill_kommentare, AutoKommentareResult};
use crate::domain::editor::auto_siebe::{auto_siebe, AutoSiebeResult};
use crate::domain::editor::normalize_patch::{invalid_edit, normalize_patch};
use crate::domain::editor::stats::compute_stats;
use crate::domain::editor::types::{
    EditorSnapshot, EditorStats, LotIdEditField, LotIdPatch,
};
use crate::domain::error::DomainResult;
use crate::domain::export::{write_abgleich_xlsx, write_abgleich_xlsx_bytes};
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

    /// Apply one or more partial LotId updates. Unknown ids or invalid values error.
    pub fn apply_patches(&mut self, patches: &[LotIdPatch]) -> DomainResult<()> {
        if patches.is_empty() {
            return Ok(());
        }

        // Validate all first so we don't partially mutate on error.
        let mut normalized = Vec::with_capacity(patches.len());
        for patch in patches {
            if patch.id.trim().is_empty() {
                return Err(invalid_edit("Zeilen-ID fehlt."));
            }
            if !patch.has_any_field() {
                continue;
            }
            let norm = normalize_patch(patch)?;
            normalized.push((patch.id.clone(), norm));
        }

        if normalized.is_empty() {
            return Ok(());
        }

        let index_by_id: HashMap<String, usize> = self
            .lot_id_rows
            .iter()
            .enumerate()
            .map(|(idx, row)| (row.id.clone(), idx))
            .collect();

        for (id, _) in &normalized {
            if !index_by_id.contains_key(id) {
                return Err(invalid_edit(format!(
                    "Unbekannte Zeilen-ID: {id}"
                )));
            }
        }

        for (id, norm) in normalized {
            let idx = index_by_id[&id];
            let row = &mut self.lot_id_rows[idx];
            if let Some(v) = norm.rfid_scan {
                row.rfid_scan = v;
            }
            if let Some(v) = norm.to_do {
                row.to_do = v;
            }
            if let Some(v) = norm.anmerkung {
                row.anmerkung = v;
            }
            if let Some(v) = norm.stichprobe {
                row.stichprobe = v;
            }
            self.edited_ids.insert(id);
        }

        self.dirty = true;
        Ok(())
    }

    /// Set one editable field on many rows (bulk toolbar).
    pub fn bulk_set(
        &mut self,
        ids: &[String],
        field: LotIdEditField,
        value: &str,
    ) -> DomainResult<()> {
        if ids.is_empty() {
            return Ok(());
        }

        let patches: Vec<LotIdPatch> = ids
            .iter()
            .map(|id| {
                let mut patch = LotIdPatch {
                    id: id.clone(),
                    ..Default::default()
                };
                match field {
                    LotIdEditField::RfidScan => patch.rfid_scan = Some(value.to_string()),
                    LotIdEditField::ToDo => patch.to_do = Some(value.to_string()),
                    LotIdEditField::Anmerkung => patch.anmerkung = Some(value.to_string()),
                    LotIdEditField::Stichprobe => patch.stichprobe = Some(value.to_string()),
                }
                patch
            })
            .collect();

        self.apply_patches(&patches)
    }

    /// Auto-Kommentare; marks changed row ids as edited when any To Do was written.
    pub fn run_auto_kommentare(&mut self) -> AutoKommentareResult {
        let before: HashMap<String, String> = self
            .lot_id_rows
            .iter()
            .map(|r| (r.id.clone(), r.to_do.clone()))
            .collect();

        let result = auto_fill_kommentare(&self.lot_id_rows);
        self.lot_id_rows = result.rows.clone();

        let mut any = false;
        for row in &self.lot_id_rows {
            if before.get(&row.id).map(String::as_str) != Some(row.to_do.as_str()) {
                self.edited_ids.insert(row.id.clone());
                any = true;
            }
        }
        if any {
            self.dirty = true;
        }

        result
    }

    /// Auto-SIEB/INST; marks changed ids as edited.
    pub fn run_auto_siebe(&mut self) -> AutoSiebeResult {
        let before: HashMap<String, String> = self
            .lot_id_rows
            .iter()
            .map(|r| (r.id.clone(), r.rfid_scan.clone()))
            .collect();

        let result = auto_siebe(&self.lot_id_rows);
        self.lot_id_rows = result.rows.clone();

        let mut any = false;
        for row in &self.lot_id_rows {
            let Some(prev_rfid) = before.get(&row.id) else {
                continue;
            };
            if prev_rfid != &row.rfid_scan {
                self.edited_ids.insert(row.id.clone());
                any = true;
            }
        }
        if any {
            self.dirty = true;
        }

        result
    }

    /// Clean `CompareResult` for Excel: LotId as-is, ArtNr freshly aggregated.
    ///
    /// No ephemeral fields (`edited_ids` / dirty) are included.
    pub fn to_export_result(&self) -> CompareResult {
        CompareResult {
            debitor: self.debitor.clone(),
            kundenname: self.kundenname.clone(),
            ax_bestand: self.ax_bestand.clone(),
            rfid_scan: self.rfid_scan.clone(),
            bestandsabgleich_artikelnummer: self.art_nr_rows(),
            bestandsabgleich_lot_id: self.lot_id_rows.clone(),
            offene_posten: self.offene_posten.clone(),
        }
    }

    /// Rebuild ArtNr from lots and write the scratch Abgleich workbook.
    pub fn write_xlsx(&self, path: &Path) -> DomainResult<()> {
        write_abgleich_xlsx(&self.to_export_result(), path)
    }

    /// Same workbook as [`Self::write_xlsx`], as raw `.xlsx` bytes for the UI save dialog.
    pub fn write_xlsx_bytes(&self) -> DomainResult<Vec<u8>> {
        write_abgleich_xlsx_bytes(&self.to_export_result())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::editor::vocabulary::{TODO_INTERNE_BERECHNUNG, TODO_INTERNE_GUTSCHRIFT};
    use crate::domain::error::DomainError;
    use crate::domain::parse::load_abgleich_xlsx;
    use pretty_assertions::assert_eq;
    use tempfile::TempDir;

    fn lot(
        art: &str,
        lot: &str,
        erp: &str,
        rfid: &str,
        id: &str,
        index: u32,
    ) -> LotIdCompareRow {
        LotIdCompareRow {
            artikelnummer: art.into(),
            produktname: format!("P-{art}"),
            kennzeichen_3: "IMP".into(),
            lot_id: lot.into(),
            eigenbestand_nach_erp: erp.into(),
            rfid_scan: rfid.into(),
            ablaufdatum: "-".into(),
            to_do: String::new(),
            anmerkung: String::new(),
            stichprobe: String::new(),
            id: id.into(),
            index,
        }
    }

    fn sample_compare(lots: Vec<LotIdCompareRow>, stale_art: Vec<ArtNrCompareRow>) -> CompareResult {
        CompareResult {
            debitor: "10521".into(),
            kundenname: "Klinik".into(),
            ax_bestand: vec![],
            rfid_scan: vec![],
            bestandsabgleich_artikelnummer: stale_art,
            bestandsabgleich_lot_id: lots,
            offene_posten: vec![],
        }
    }

    #[test]
    fn from_compare_ignores_stale_art_nr() {
        let lots = vec![
            lot("100", "L1", "1", "1", "a", 1),
            lot("100", "L2", "1", "0", "b", 2),
        ];
        let stale = vec![ArtNrCompareRow {
            artikelnummer: "100".into(),
            produktname: "P-100".into(),
            eigenbestand_nach_erp: 99,
            rfid_scan: 99,
            differenz: 0,
            id: "stale".into(),
        }];
        let draft = InventurDraft::from_compare(sample_compare(lots, stale));
        let art = draft.art_nr_rows();
        assert_eq!(art.len(), 1);
        assert_eq!(art[0].eigenbestand_nach_erp, 2);
        assert_eq!(art[0].rfid_scan, 1);
        assert_eq!(art[0].differenz, 1);
        assert_eq!(art[0].id, "100");
        assert!(!draft.is_dirty());
    }

    #[test]
    fn patch_rfid_updates_art_nr_differenz() {
        let lots = vec![lot("100", "L1", "1", "0", "a", 1)];
        let mut draft = InventurDraft::from_compare(sample_compare(lots, vec![]));
        assert_eq!(draft.art_nr_rows()[0].differenz, 1);

        draft
            .apply_patches(&[LotIdPatch {
                id: "a".into(),
                rfid_scan: Some("1".into()),
                ..Default::default()
            }])
            .unwrap();

        assert_eq!(draft.lot_id_rows()[0].rfid_scan, "1");
        assert_eq!(draft.art_nr_rows()[0].differenz, 0);
        assert!(draft.is_dirty());
        assert!(draft.edited_ids().contains("a"));
    }

    #[test]
    fn bulk_set_todo_on_three_ids() {
        let lots = vec![
            lot("100", "L1", "1", "1", "a", 1),
            lot("100", "L2", "1", "1", "b", 2),
            lot("200", "L3", "1", "1", "c", 3),
        ];
        let mut draft = InventurDraft::from_compare(sample_compare(lots, vec![]));
        draft
            .bulk_set(
                &["a".into(), "b".into(), "c".into()],
                LotIdEditField::ToDo,
                "NUR berechnen",
            )
            .unwrap();
        assert!(draft
            .lot_id_rows()
            .iter()
            .all(|r| r.to_do == "NUR berechnen"));
        assert_eq!(draft.edited_ids().len(), 3);
    }

    #[test]
    fn unknown_id_errors_without_partial_apply() {
        let lots = vec![lot("100", "L1", "1", "0", "a", 1)];
        let mut draft = InventurDraft::from_compare(sample_compare(lots, vec![]));
        let err = draft
            .apply_patches(&[
                LotIdPatch {
                    id: "a".into(),
                    rfid_scan: Some("1".into()),
                    ..Default::default()
                },
                LotIdPatch {
                    id: "missing".into(),
                    to_do: Some("NUR berechnen".into()),
                    ..Default::default()
                },
            ])
            .unwrap_err();
        assert!(matches!(err, DomainError::InvalidEdit { .. }));
        assert_eq!(draft.lot_id_rows()[0].rfid_scan, "0");
        assert!(!draft.is_dirty());
    }

    #[test]
    fn invalid_vocabulary_rejected() {
        let lots = vec![lot("100", "L1", "1", "1", "a", 1)];
        let mut draft = InventurDraft::from_compare(sample_compare(lots, vec![]));
        let err = draft
            .bulk_set(&["a".into()], LotIdEditField::ToDo, "not-a-real-todo")
            .unwrap_err();
        assert!(matches!(err, DomainError::InvalidEdit { .. }));
        assert_eq!(draft.lot_id_rows()[0].to_do, "");
    }

    #[test]
    fn stichprobe_normalizes_lowercase_x() {
        let lots = vec![lot("100", "L1", "1", "1", "a", 1)];
        let mut draft = InventurDraft::from_compare(sample_compare(lots, vec![]));
        draft
            .apply_patches(&[LotIdPatch {
                id: "a".into(),
                stichprobe: Some("x".into()),
                ..Default::default()
            }])
            .unwrap();
        assert_eq!(draft.lot_id_rows()[0].stichprobe, "X");
        assert_eq!(draft.stats().stichproben_done, 1);
    }

    #[test]
    fn stats_stichproben_required_from_ax_quantity() {
        let lots = vec![
            lot("100", "L1", "1", "1", "a", 1),
            lot("100", "L2", "1", "1", "b", 2),
        ];
        let mut compare = sample_compare(lots, vec![]);
        compare.ax_bestand = vec![
            ErpRow {
                artikelnummer: "100".into(),
                produktname: "P".into(),
                lot_id: "L1".into(),
                kennzeichen_3: "IMP".into(),
                ablaufdatum: "-".into(),
                debitorenkonto: "10521".into(),
                eigenbestand_nach_erp: "80".into(),
                extra: vec![],
            },
            ErpRow {
                artikelnummer: "100".into(),
                produktname: "P".into(),
                lot_id: "L2".into(),
                kennzeichen_3: "IMP".into(),
                ablaufdatum: "-".into(),
                debitorenkonto: "10521".into(),
                eigenbestand_nach_erp: "21".into(),
                extra: vec![],
            },
        ];
        let mut draft = InventurDraft::from_compare(compare);
        let before = draft.stats();
        assert_eq!(before.erp_quantity_total, 101);
        assert_eq!(before.stichproben_required, 2);
        assert_eq!(before.stichproben_done, 0);

        draft
            .apply_patches(&[LotIdPatch {
                id: "a".into(),
                stichprobe: Some("X".into()),
                ..Default::default()
            }])
            .unwrap();
        let after = draft.stats();
        assert_eq!(after.stichproben_done, 1);
        assert_eq!(after.stichproben_required, 2);
    }

    #[test]
    fn auto_kommentare_marks_dirty_and_edited() {
        let lots = vec![
            lot("100", "L1", "1", "0", "m1", 1),
            lot("100", "L2", "0", "1", "e1", 2),
        ];
        let mut draft = InventurDraft::from_compare(sample_compare(lots, vec![]));
        let result = draft.run_auto_kommentare();
        assert_eq!(result.changed_count, 2);
        assert!(draft.is_dirty());
        assert!(draft.edited_ids().contains("m1"));
        assert!(draft.edited_ids().contains("e1"));
        let by_id: HashMap<_, _> = draft
            .lot_id_rows()
            .iter()
            .map(|r| (r.id.as_str(), r))
            .collect();
        assert_eq!(by_id["m1"].to_do, TODO_INTERNE_BERECHNUNG);
        assert_eq!(by_id["e1"].to_do, TODO_INTERNE_GUTSCHRIFT);
    }

    #[test]
    fn to_export_result_art_nr_matches_aggregate() {
        let lots = vec![
            lot("100", "L1", "1", "0", "a", 1),
            lot("100", "L2", "1", "1", "b", 2),
        ];
        let mut draft = InventurDraft::from_compare(sample_compare(lots, vec![]));
        draft
            .apply_patches(&[LotIdPatch {
                id: "a".into(),
                rfid_scan: Some("1".into()),
                to_do: Some("NUR berechnen".into()),
                ..Default::default()
            }])
            .unwrap();

        let exported = draft.to_export_result();
        assert_eq!(
            exported.bestandsabgleich_artikelnummer,
            aggregate_art_nr_from_lot_id(&exported.bestandsabgleich_lot_id)
        );
        assert_eq!(exported.bestandsabgleich_artikelnummer[0].differenz, 0);
        assert_eq!(exported.bestandsabgleich_lot_id[0].to_do, "NUR berechnen");
    }

    #[test]
    fn write_xlsx_roundtrip_preserves_lot_edits() {
        let lots = vec![lot("100", "L1", "1", "0", "a", 1)];
        let mut draft = InventurDraft::from_compare(sample_compare(lots, vec![]));
        draft
            .apply_patches(&[LotIdPatch {
                id: "a".into(),
                rfid_scan: Some("1".into()),
                to_do: Some("NUR berechnen".into()),
                anmerkung: Some("AWS".into()),
                stichprobe: Some("X".into()),
            }])
            .unwrap();

        let dir = TempDir::new().unwrap();
        let path = dir.path().join("abgleich.xlsx");
        draft.write_xlsx(&path).unwrap();

        let loaded = load_abgleich_xlsx(&path).unwrap();
        assert_eq!(loaded.bestandsabgleich_lot_id.len(), 1);
        let row = &loaded.bestandsabgleich_lot_id[0];
        assert_eq!(row.rfid_scan, "1");
        assert_eq!(row.to_do, "NUR berechnen");
        assert_eq!(row.anmerkung, "AWS");
        assert_eq!(row.stichprobe, "X");
        let reloaded = InventurDraft::from_compare(loaded);
        assert_eq!(reloaded.art_nr_rows()[0].differenz, 0);
    }

    #[test]
    fn snapshot_includes_stats_and_sorted_edited_ids() {
        let lots = vec![
            lot("100", "L1", "1", "0", "b", 1),
            lot("100", "L2", "1", "1", "a", 2),
        ];
        let mut draft = InventurDraft::from_compare(sample_compare(lots, vec![]));
        draft
            .bulk_set(&["b".into()], LotIdEditField::Stichprobe, "X")
            .unwrap();
        let snap = draft.snapshot();
        assert_eq!(snap.stats.abweichungen, 1);
        assert_eq!(snap.stats.stichproben_done, 1);
        assert_eq!(snap.edited_ids, vec!["b".to_string()]);
        assert_eq!(snap.art_nr_rows[0].differenz, 1);
    }

    #[test]
    fn erp_flag_cannot_be_changed_via_patch_api() {
        let lots = vec![lot("100", "L1", "1", "0", "a", 1)];
        let mut draft = InventurDraft::from_compare(sample_compare(lots, vec![]));
        draft
            .apply_patches(&[LotIdPatch {
                id: "a".into(),
                rfid_scan: Some("1".into()),
                ..Default::default()
            }])
            .unwrap();
        assert_eq!(draft.lot_id_rows()[0].eigenbestand_nach_erp, "1");
    }

    fn open_position(art: &str, lot: &str, offen: &str) -> OffenePostenRow {
        OffenePostenRow {
            artikelnummer: art.into(),
            produktname: format!("P-{art}"),
            lot_id: lot.into(),
            ablaufdatum: "01.05.2027".into(),
            offen: offen.into(),
            id: format!("op-{lot}"),
        }
    }

    #[test]
    fn offene_posten_stay_read_only_and_out_of_stats() {
        let mut compare = sample_compare(vec![lot("100", "L1", "1", "1", "a", 1)], vec![]);
        compare.offene_posten = vec![open_position("100", "L9", "2")];
        let draft = InventurDraft::from_compare(compare);

        assert_eq!(draft.offene_posten().len(), 1);
        assert_eq!(
            draft.snapshot().offene_posten.as_slice(),
            draft.offene_posten()
        );
        assert_eq!(
            draft.to_export_result().offene_posten.as_slice(),
            draft.offene_posten()
        );
        assert_eq!(draft.lot_id_rows().len(), 1);
        assert_eq!(draft.stats().abweichungen, 0);
        assert!(!draft.is_dirty());
    }

    #[test]
    fn snapshot_json_without_offene_posten_loads_as_empty() {
        let draft = InventurDraft::from_compare(sample_compare(
            vec![lot("100", "L1", "1", "1", "a", 1)],
            vec![],
        ));
        let mut json = serde_json::to_value(draft.snapshot()).unwrap();
        json.as_object_mut().unwrap().remove("offene_posten");

        let snapshot: EditorSnapshot = serde_json::from_value(json).unwrap();
        assert!(snapshot.offene_posten.is_empty());
        assert_eq!(snapshot.lot_id_rows.len(), 1);
    }
}
