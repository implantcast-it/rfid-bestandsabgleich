//! Auto-SIEB/INST: force RFID presence for sieves and missing instruments.
//!
//! Offene Posten are ERP rows with numeric `Insgesamt bestellt` (ordered, not on site).
//! They live on their own sheet/tab and are never inferred from LotId ERP/RFID flags.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::domain::editor::helpers::is_absent;
use crate::domain::types::LotIdCompareRow;

/// Result of Auto-SIEB/INST.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AutoSiebeResult {
    pub rows: Vec<LotIdCompareRow>,
    /// Rows matching SIEB (always) or INST with RFID=0 (React counter semantics).
    pub sieb_inst_row_count: usize,
}

#[derive(Default)]
struct Patch {
    rfid_scan: Option<String>,
}

/// Apply SIEB/INST RFID force on LotId rows.
pub fn auto_siebe(rows: &[LotIdCompareRow]) -> AutoSiebeResult {
    let mut patches: HashMap<String, Patch> = HashMap::new();
    let mut sieb_inst_row_count = 0usize;

    for row in rows {
        let is_sieb = row.kennzeichen_3 == "SIEB";
        let is_inst_missing = row.kennzeichen_3 == "INST" && is_absent(&row.rfid_scan);
        if !is_sieb && !is_inst_missing {
            continue;
        }

        patches.insert(
            row.id.clone(),
            Patch {
                rfid_scan: Some("1".into()),
            },
        );
        sieb_inst_row_count += 1;
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
            next
        })
        .collect();

    AutoSiebeResult {
        rows: updated,
        sieb_inst_row_count,
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
        let result = auto_siebe(&rows);
        assert_eq!(result.rows[0].rfid_scan, "1");
        assert_eq!(result.sieb_inst_row_count, 1);
    }

    #[test]
    fn sieb_already_one_still_counted() {
        let rows = [lot("100", "SIEB", "1", "1", "", "s1")];
        let result = auto_siebe(&rows);
        assert_eq!(result.rows[0].rfid_scan, "1");
        assert_eq!(result.sieb_inst_row_count, 1);
    }

    #[test]
    fn inst_only_when_rfid_was_zero() {
        let rows = [
            lot("100", "INST", "1", "0", "", "i0"),
            lot("100", "INST", "1", "1", "", "i1"),
        ];
        let result = auto_siebe(&rows);
        let by_id: HashMap<_, _> = result.rows.iter().map(|r| (r.id.as_str(), r)).collect();
        assert_eq!(by_id["i0"].rfid_scan, "1");
        assert_eq!(by_id["i1"].rfid_scan, "1");
        assert_eq!(result.sieb_inst_row_count, 1);
    }

    #[test]
    fn erp_zero_rfid_zero_does_not_set_anmerkung() {
        let rows = [lot("100", "IMP", "0", "0", "", "o1")];
        let result = auto_siebe(&rows);
        assert_eq!(result.rows[0].anmerkung, "");
        assert_eq!(result.rows[0].rfid_scan, "0");
        assert_eq!(result.sieb_inst_row_count, 0);
    }

    #[test]
    fn sieb_with_erp_zero_only_forces_rfid() {
        let rows = [lot("100", "SIEB", "0", "0", "keep", "both")];
        let result = auto_siebe(&rows);
        assert_eq!(result.rows[0].rfid_scan, "1");
        assert_eq!(result.rows[0].anmerkung, "keep");
        assert_eq!(result.sieb_inst_row_count, 1);
    }

    #[test]
    fn no_matches_leaves_rows_unchanged() {
        let rows = [lot("100", "IMP", "1", "1", "", "a")];
        let result = auto_siebe(&rows);
        assert_eq!(result.sieb_inst_row_count, 0);
        assert_eq!(result.rows, rows);
    }
}
