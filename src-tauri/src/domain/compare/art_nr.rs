//! Artikelnummer comparison — **row counts**, not ERP quantity values.
//!
//! `Differenz = Eigenbestand nach ERP (count) − RFID-Scan (count)`.
//! Empty-LotId ERP rows still count (they are present stock lines).

use std::collections::BTreeMap;

use uuid::Uuid;

use crate::domain::types::{ArtNrCompareRow, ErpRow, RfidRow};

/// Aggregate ERP + RFID rows by Artikelnummer.
pub fn compare_art_nr(erp: &[ErpRow], rfid: &[RfidRow]) -> Vec<ArtNrCompareRow> {
    // BTreeMap keeps deterministic ordering for tests / stable exports.
    let mut counts: BTreeMap<String, ArtNrCompareRow> = BTreeMap::new();

    for item in erp {
        let entry = counts
            .entry(item.artikelnummer.clone())
            .or_insert_with(|| ArtNrCompareRow {
                artikelnummer: item.artikelnummer.clone(),
                produktname: item.produktname.clone(),
                erp: 0,
                rfid_scan: 0,
                differenz: 0,
                id: Uuid::new_v4().to_string(),
            });
        entry.erp += 1;
    }

    for item in rfid {
        let entry = counts
            .entry(item.artikelnummer.clone())
            .or_insert_with(|| ArtNrCompareRow {
                artikelnummer: item.artikelnummer.clone(),
                produktname: item.produktname.clone(),
                erp: 0,
                rfid_scan: 0,
                differenz: 0,
                id: Uuid::new_v4().to_string(),
            });
        entry.rfid_scan += 1;
    }

    counts
        .into_values()
        .map(|mut row| {
            row.differenz = row.erp - row.rfid_scan;
            row
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    fn erp(art: &str, lot: &str) -> ErpRow {
        ErpRow {
            artikelnummer: art.into(),
            produktname: format!("P-{art}"),
            lot_id: lot.into(),
            kennzeichen_3: "IMP".into(),
            ablaufdatum: "-".into(),
            debitorenkonto: "1".into(),
            erp: "1".into(),
            extra: vec![],
        }
    }

    fn rfid(art: &str, lot: &str) -> RfidRow {
        RfidRow {
            gtin: "1".into(),
            lot_id: lot.into(),
            kennung_1: "QM".into(),
            debitorennummer: "1".into(),
            erfasst_um: "12:00".into(),
            artikelnummer: art.into(),
            produktname: format!("P-{art}"),
            kennzeichen_3: "IMP".into(),
        }
    }

    #[test]
    fn counts_rows_not_quantities() {
        let rows = compare_art_nr(
            &[erp("A", "L1"), erp("A", ""), erp("B", "L2")],
            &[rfid("A", "L1")],
        );
        let a = rows.iter().find(|r| r.artikelnummer == "A").unwrap();
        // Two ERP rows for A (including empty LotId) vs one RFID → Differenz 1
        assert_eq!(a.erp, 2);
        assert_eq!(a.rfid_scan, 1);
        assert_eq!(a.differenz, 1);
    }

    #[test]
    fn rfid_only_article_appears() {
        let rows = compare_art_nr(&[], &[rfid("X", "L9")]);
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].erp, 0);
        assert_eq!(rows[0].rfid_scan, 1);
        assert_eq!(rows[0].differenz, -1);
    }

    #[test]
    fn match_yields_zero_differenz() {
        let rows = compare_art_nr(&[erp("A", "L1")], &[rfid("A", "L1")]);
        assert_eq!(rows[0].differenz, 0);
    }
}
