//! Re-aggregate ArtNr rows from editable LotId rows.
//!
//! ## Differs from inventur-time [`crate::domain::compare::compare_art_nr`]
//!
//! | | `compare_art_nr` | `aggregate_art_nr_from_lot_id` |
//! |-|------------------|-------------------------------|
//! | Input | ERP + RFID raw rows | LotId compare rows |
//! | ERP count | Number of ERP **rows** (incl. empty LotId) | Sum of LotId `eigenbestand_nach_erp` flags |
//! | RFID count | Number of RFID rows | Sum of LotId `rfid_scan` flags |
//! | `id` | new UUID | `artikelnummer` |
//!
//! This matches the editor `useEffect` in `EditorScreen.tsx`.

use std::collections::BTreeMap;

use crate::domain::editor::helpers::presence_as_i64;
use crate::domain::types::{ArtNrCompareRow, LotIdCompareRow};

/// Group LotId rows by Artikelnummer and sum presence flags.
pub fn aggregate_art_nr_from_lot_id(rows: &[LotIdCompareRow]) -> Vec<ArtNrCompareRow> {
    let mut groups: BTreeMap<String, ArtNrCompareRow> = BTreeMap::new();

    for row in rows {
        let art = row.artikelnummer.trim();
        if art.is_empty() {
            continue;
        }

        let entry = groups.entry(art.to_string()).or_insert_with(|| ArtNrCompareRow {
            artikelnummer: art.to_string(),
            produktname: row.produktname.clone(),
            eigenbestand_nach_erp: 0,
            rfid_scan: 0,
            differenz: 0,
            id: art.to_string(),
        });

        entry.eigenbestand_nach_erp += presence_as_i64(&row.eigenbestand_nach_erp);
        entry.rfid_scan += presence_as_i64(&row.rfid_scan);
    }

    groups
        .into_values()
        .map(|mut row| {
            row.differenz = row.eigenbestand_nach_erp - row.rfid_scan;
            row
        })
        .collect()
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
        id: &str,
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
            index: 1,
        }
    }

    #[test]
    fn sums_two_lots_for_same_art_nr() {
        let rows = [
            lot("100", "L1", "1", "1", "a"),
            lot("100", "L2", "1", "0", "b"),
        ];
        let art = aggregate_art_nr_from_lot_id(&rows);
        assert_eq!(art.len(), 1);
        assert_eq!(art[0].eigenbestand_nach_erp, 2);
        assert_eq!(art[0].rfid_scan, 1);
        assert_eq!(art[0].differenz, 1);
        assert_eq!(art[0].id, "100");
        assert_eq!(art[0].artikelnummer, "100");
    }

    #[test]
    fn skips_empty_artikelnummer() {
        let rows = [lot("", "L1", "1", "1", "a"), lot("200", "L2", "0", "1", "b")];
        let art = aggregate_art_nr_from_lot_id(&rows);
        assert_eq!(art.len(), 1);
        assert_eq!(art[0].artikelnummer, "200");
        assert_eq!(art[0].differenz, -1);
    }

    #[test]
    fn id_equals_artikelnummer() {
        let rows = [lot("XYZ", "L1", "1", "1", "uuid-ignored")];
        let art = aggregate_art_nr_from_lot_id(&rows);
        assert_eq!(art[0].id, "XYZ");
    }
}
