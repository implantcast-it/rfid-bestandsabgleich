use std::collections::HashMap;

use super::InventurDraft;
use crate::domain::editor::auto_kommentare::{auto_fill_kommentare, AutoKommentareResult};
use crate::domain::editor::auto_siebe::{auto_siebe, AutoSiebeResult};

impl InventurDraft {
    fn mark_edited(&mut self, changed: impl IntoIterator<Item = String>) {
        let mut any = false;
        for id in changed {
            self.edited_ids.insert(id);
            any = true;
        }
        if any {
            self.dirty = true;
        }
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

        let changed: Vec<String> = self
            .lot_id_rows
            .iter()
            .filter_map(|row| {
                if before.get(&row.id).map(String::as_str) != Some(row.to_do.as_str()) {
                    Some(row.id.clone())
                } else {
                    None
                }
            })
            .collect();
        self.mark_edited(changed);

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

        let changed: Vec<String> = self
            .lot_id_rows
            .iter()
            .filter_map(|row| {
                let prev_rfid = before.get(&row.id)?;
                if prev_rfid != &row.rfid_scan {
                    Some(row.id.clone())
                } else {
                    None
                }
            })
            .collect();
        self.mark_edited(changed);

        result
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::super::fixtures::{lot, sample_compare};
    use super::super::InventurDraft;
    use crate::domain::editor::vocabulary::{TODO_INTERNE_BERECHNUNG, TODO_INTERNE_GUTSCHRIFT};
    use pretty_assertions::assert_eq;

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
}
