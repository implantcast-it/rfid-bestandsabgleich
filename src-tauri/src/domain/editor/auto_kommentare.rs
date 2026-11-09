//! Auto-Kommentare: pair missing ↔ extra lots within the same Artikelnummer.
//!
//! Parity with `handleAutoFillKommentare` in `EditorScreen.tsx`.

use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

use crate::domain::editor::helpers::{is_absent, is_present, is_todo_empty};
use crate::domain::editor::vocabulary::{TODO_INTERNE_BERECHNUNG, TODO_INTERNE_GUTSCHRIFT};
use crate::domain::types::LotIdCompareRow;

/// Result of Auto-Kommentare (updated rows + toast-friendly summary).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AutoKommentareResult {
    pub rows: Vec<LotIdCompareRow>,
    /// Artikelnummern where at least one pair received To Dos.
    pub affected_artikelnummern: Vec<String>,
    /// Number of LotId rows whose To Do was written.
    pub changed_count: usize,
}

/// Pair unmatched lots per Artikelnummer when both To Dos are empty.
///
/// - Missing: ERP=1, RFID=0 → `interne Berechnung`
/// - Extra: ERP=0, RFID=1 → `interne Gutschrift mit Rückbuchung auf Konsi`
/// - Pair count = `min(missing, extra)` in encounter order within the group
pub fn auto_fill_kommentare(rows: &[LotIdCompareRow]) -> AutoKommentareResult {
    let mut grouped: HashMap<String, Vec<usize>> = HashMap::new();
    for (idx, row) in rows.iter().enumerate() {
        grouped
            .entry(row.artikelnummer.clone())
            .or_default()
            .push(idx);
    }

    let mut patches: HashMap<String, String> = HashMap::new();
    let mut affected: Vec<String> = Vec::new();
    let mut affected_set: HashSet<String> = HashSet::new();

    for (artikelnummer, indices) in &grouped {
        let missing: Vec<usize> = indices
            .iter()
            .copied()
            .filter(|&i| {
                is_present(&rows[i].erp) && is_absent(&rows[i].rfid_scan)
            })
            .collect();
        let extras: Vec<usize> = indices
            .iter()
            .copied()
            .filter(|&i| {
                is_absent(&rows[i].erp) && is_present(&rows[i].rfid_scan)
            })
            .collect();

        let num_pairs = missing.len().min(extras.len());
        if num_pairs == 0 {
            continue;
        }

        let mut changed_for_article = false;
        for i in 0..num_pairs {
            let missing_idx = missing[i];
            let extra_idx = extras[i];
            let missing_row = &rows[missing_idx];
            let extra_row = &rows[extra_idx];

            if is_todo_empty(&missing_row.to_do) && is_todo_empty(&extra_row.to_do) {
                patches.insert(missing_row.id.clone(), TODO_INTERNE_BERECHNUNG.to_string());
                patches.insert(extra_row.id.clone(), TODO_INTERNE_GUTSCHRIFT.to_string());
                changed_for_article = true;
            }
        }

        if changed_for_article && affected_set.insert(artikelnummer.clone()) {
            affected.push(artikelnummer.clone());
        }
    }

    let changed_count = patches.len();
    let updated: Vec<LotIdCompareRow> = rows
        .iter()
        .map(|row| {
            if let Some(todo) = patches.get(&row.id) {
                let mut next = row.clone();
                next.to_do = todo.clone();
                next
            } else {
                row.clone()
            }
        })
        .collect();

    AutoKommentareResult {
        rows: updated,
        affected_artikelnummern: affected,
        changed_count,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    fn lot(
        art: &str,
        lot: &str,
        erp: &str,
        rfid: &str,
        todo: &str,
        id: &str,
    ) -> LotIdCompareRow {
        LotIdCompareRow {
            artikelnummer: art.into(),
            produktname: format!("P-{art}"),
            kennzeichen_3: "IMP".into(),
            lot_id: lot.into(),
            erp: erp.into(),
            rfid_scan: rfid.into(),
            ablaufdatum: "-".into(),
            to_do: todo.into(),
            anmerkung: String::new(),
            stichprobe: String::new(),
            id: id.into(),
            index: 1,
        }
    }

    #[test]
    fn pairs_one_missing_and_one_extra() {
        let rows = [
            lot("100", "L1", "1", "0", "", "m1"),
            lot("100", "L2", "0", "1", "", "e1"),
        ];
        let result = auto_fill_kommentare(&rows);
        assert_eq!(result.changed_count, 2);
        assert_eq!(result.affected_artikelnummern, vec!["100"]);
        let by_id: HashMap<_, _> = result.rows.iter().map(|r| (r.id.as_str(), r)).collect();
        assert_eq!(by_id["m1"].to_do, TODO_INTERNE_BERECHNUNG);
        assert_eq!(by_id["e1"].to_do, TODO_INTERNE_GUTSCHRIFT);
    }

    #[test]
    fn does_not_overwrite_non_empty_todo() {
        let rows = [
            lot("100", "L1", "1", "0", "NUR berechnen", "m1"),
            lot("100", "L2", "0", "1", "", "e1"),
        ];
        let result = auto_fill_kommentare(&rows);
        assert_eq!(result.changed_count, 0);
        assert!(result.affected_artikelnummern.is_empty());
        assert_eq!(result.rows[0].to_do, "NUR berechnen");
        assert_eq!(result.rows[1].to_do, "");
    }

    #[test]
    fn num_pairs_caps_at_min_unpaired_unchanged() {
        let rows = [
            lot("100", "L1", "1", "0", "", "m1"),
            lot("100", "L2", "1", "0", "", "m2"),
            lot("100", "L3", "0", "1", "", "e1"),
        ];
        let result = auto_fill_kommentare(&rows);
        assert_eq!(result.changed_count, 2);
        let by_id: HashMap<_, _> = result.rows.iter().map(|r| (r.id.as_str(), r)).collect();
        assert_eq!(by_id["m1"].to_do, TODO_INTERNE_BERECHNUNG);
        assert_eq!(by_id["e1"].to_do, TODO_INTERNE_GUTSCHRIFT);
        assert_eq!(by_id["m2"].to_do, "");
    }

    #[test]
    fn no_pairs_leaves_rows_unchanged() {
        let rows = [lot("100", "L1", "1", "1", "", "a")];
        let result = auto_fill_kommentare(&rows);
        assert_eq!(result.changed_count, 0);
        assert_eq!(result.rows, rows);
    }

    #[test]
    fn two_articles_independently() {
        let rows = [
            lot("100", "L1", "1", "0", "", "m100"),
            lot("100", "L2", "0", "1", "", "e100"),
            lot("200", "L3", "1", "0", "", "m200"),
            lot("200", "L4", "0", "1", "", "e200"),
        ];
        let result = auto_fill_kommentare(&rows);
        assert_eq!(result.changed_count, 4);
        assert_eq!(result.affected_artikelnummern.len(), 2);
        assert!(result.affected_artikelnummern.contains(&"100".into()));
        assert!(result.affected_artikelnummern.contains(&"200".into()));
    }
}
