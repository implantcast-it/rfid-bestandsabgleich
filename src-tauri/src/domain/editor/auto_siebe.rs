//! Auto-SIEB/INST and Offene Posten.
//!
//! Parity with `handleAutoSiebeAndOffenePosten` in `EditorScreen.tsx`.
//! Conditions are evaluated on the **original** row before mutations.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::domain::editor::helpers::is_absent;
use crate::domain::editor::vocabulary::ANMERKUNG_OFFENER_POSTEN;
use crate::domain::types::LotIdCompareRow;

/// Result of Auto-SIEB/INST + Offene Posten.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AutoSiebeResult {
    pub rows: Vec<LotIdCompareRow>,
    /// Rows matching SIEB (always) or INST with RFID=0 (React counter semantics).
    pub sieb_inst_row_count: usize,
    /// Rows with ERP=0 and RFID=0 on the original row (may overlap with SIEB).
    pub offene_posten_row_count: usize,
}

#[derive(Default)]
struct Patch {
    rfid_scan: Option<String>,
    anmerkung: Option<String>,
}

/// Apply SIEB/INST RFID force and Offene-Posten Anmerkung.
pub fn auto_siebe_and_offene_posten(rows: &[LotIdCompareRow]) -> AutoSiebeResult {
    let mut patches: HashMap<String, Patch> = HashMap::new();
    let mut sieb_inst_row_count = 0usize;
    let mut offene_posten_row_count = 0usize;

    for row in rows {
        let mut patch = Patch::default();

        // Auto-Siebe / INST — count every matching row (even if RFID already 1).
        let is_sieb = row.kennzeichen_3 == "SIEB";
        let is_inst_missing = row.kennzeichen_3 == "INST" && is_absent(&row.rfid_scan);
        if is_sieb || is_inst_missing {
            patch.rfid_scan = Some("1".into());
            sieb_inst_row_count += 1;
        }

        // Offene Posten — evaluated on original ERP/RFID flags.
        if is_absent(&row.eigenbestand_nach_erp) && is_absent(&row.rfid_scan) {
            patch.anmerkung = Some(ANMERKUNG_OFFENER_POSTEN.to_string());
            offene_posten_row_count += 1;
        }

        if patch.rfid_scan.is_some() || patch.anmerkung.is_some() {
            patches.insert(row.id.clone(), patch);
        }
    }

    let updated: Vec<LotIdCompareRow> = rows
        .iter()
        .map(|row| {
            let Some(patch) = patches.get(&row.id) else {
                return row.clone();
            };
            let mut next = row.clone();
            if let Some(rfid) = &patch.rfid_scan {
                next.rfid_scan = rfid.clone();
            }
            if let Some(anmerkung) = &patch.anmerkung {
                next.anmerkung = anmerkung.clone();
            }
            next
        })
        .collect();

    AutoSiebeResult {
        rows: updated,
        sieb_inst_row_count,
        offene_posten_row_count,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    fn lot(
        art: &str,
        kz: &str,
        erp: &str,
        rfid: &str,
        anmerkung: &str,
        id: &str,
    ) -> LotIdCompareRow {
        LotIdCompareRow {
            artikelnummer: art.into(),
            produktname: format!("P-{art}"),
            kennzeichen_3: kz.into(),
            lot_id: id.into(),
            eigenbestand_nach_erp: erp.into(),
            rfid_scan: rfid.into(),
            ablaufdatum: "-".into(),
            to_do: String::new(),
            anmerkung: anmerkung.into(),
            stichprobe: String::new(),
            id: id.into(),
            index: 1,
        }
    }

    #[test]
    fn sieb_forces_rfid_one() {
        let rows = [lot("100", "SIEB", "1", "0", "", "s1")];
        let result = auto_siebe_and_offene_posten(&rows);
        assert_eq!(result.rows[0].rfid_scan, "1");
        assert_eq!(result.sieb_inst_row_count, 1);
    }

    #[test]
    fn sieb_already_one_still_counted() {
        let rows = [lot("100", "SIEB", "1", "1", "", "s1")];
        let result = auto_siebe_and_offene_posten(&rows);
        assert_eq!(result.rows[0].rfid_scan, "1");
        assert_eq!(result.sieb_inst_row_count, 1);
        assert_eq!(result.offene_posten_row_count, 0);
    }

    #[test]
    fn inst_only_when_rfid_was_zero() {
        let rows = [
            lot("100", "INST", "1", "0", "", "i0"),
            lot("100", "INST", "1", "1", "", "i1"),
        ];
        let result = auto_siebe_and_offene_posten(&rows);
        let by_id: HashMap<_, _> = result.rows.iter().map(|r| (r.id.as_str(), r)).collect();
        assert_eq!(by_id["i0"].rfid_scan, "1");
        assert_eq!(by_id["i1"].rfid_scan, "1");
        assert_eq!(result.sieb_inst_row_count, 1);
    }

    #[test]
    fn offene_posten_sets_anmerkung() {
        let rows = [lot("100", "IMP", "0", "0", "", "o1")];
        let result = auto_siebe_and_offene_posten(&rows);
        assert_eq!(result.rows[0].anmerkung, ANMERKUNG_OFFENER_POSTEN);
        assert_eq!(result.offene_posten_row_count, 1);
        assert_eq!(result.sieb_inst_row_count, 0);
        // RFID unchanged for plain IMP offener Posten
        assert_eq!(result.rows[0].rfid_scan, "0");
    }

    #[test]
    fn combined_sieb_and_offener_posten_on_same_row() {
        let rows = [lot("100", "SIEB", "0", "0", "", "both")];
        let result = auto_siebe_and_offene_posten(&rows);
        assert_eq!(result.rows[0].rfid_scan, "1");
        assert_eq!(result.rows[0].anmerkung, ANMERKUNG_OFFENER_POSTEN);
        assert_eq!(result.sieb_inst_row_count, 1);
        assert_eq!(result.offene_posten_row_count, 1);
    }

    #[test]
    fn no_matches_leaves_rows_unchanged() {
        let rows = [lot("100", "IMP", "1", "1", "", "a")];
        let result = auto_siebe_and_offene_posten(&rows);
        assert_eq!(result.sieb_inst_row_count, 0);
        assert_eq!(result.offene_posten_row_count, 0);
        assert_eq!(result.rows, rows);
    }
}
