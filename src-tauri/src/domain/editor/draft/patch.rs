use std::collections::HashMap;

use super::InventurDraft;
use crate::domain::editor::normalize_patch::{invalid_edit, normalize_patch};
use crate::domain::editor::types::{LotIdEditField, LotIdPatch};
use crate::domain::error::DomainResult;

impl InventurDraft {
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
                return Err(invalid_edit(format!("Unbekannte Zeilen-ID: {id}")));
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
}

#[cfg(test)]
mod tests {
    use super::super::fixtures::{lot, sample_compare};
    use super::super::InventurDraft;
    use crate::domain::editor::types::{LotIdEditField, LotIdPatch};
    use crate::domain::error::DomainError;
    use pretty_assertions::assert_eq;

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
}
