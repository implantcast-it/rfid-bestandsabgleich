//! ERP Excel parser — first sheet only.
//!
//! - Renames `Physischer Bestand` → `Eigenbestand nach ERP`
//! - Debitor = first row's `Debitorenkonto`, or `"Unbekannt"`
//! - Accepts `Kennzeichen 3` or legacy `Kennzeichen`
//! - LotId is normalized (trim + cleanup) for later map keys
//! - A number in `Insgesamt bestellt` makes the row an Offene Posten, kept out of the stock rows

use std::collections::HashMap;
use std::path::Path;

use uuid::Uuid;

use crate::domain::error::DomainResult;
use crate::domain::normalize::{
    cell_to_string, cmp_artikelnummer, normalize_count, normalize_lot_id,
};
use crate::domain::parse::excel::read_sheet_rows;
use crate::domain::parse::master::kennzeichen_from_row;
use crate::domain::types::{ErpRow, OffenePostenRow, UNBEKANNT};

/// Column whose number marks an Offene Posten row; the number is its `offen` count.
const OFFENE_POSTEN_COLUMN: &str = "Insgesamt bestellt";

/// Columns consumed into typed fields (everything else goes to `extra` for Ax-Bestand).
const KNOWN_COLUMNS: &[&str] = &[
    "Artikelnummer",
    "Produktname",
    "LotId",
    "Kennzeichen 3",
    "Kennzeichen",
    "Ablaufdatum",
    "Debitorenkonto",
    "Physischer Bestand",
    "Eigenbestand nach ERP",
    OFFENE_POSTEN_COLUMN,
];

/// ERP sheet split into stock rows and Offene Posten, plus the debitor.
#[derive(Debug, Clone)]
pub struct ErpImport {
    /// Stock rows for the Abgleich (`Insgesamt bestellt` empty or not numeric).
    pub rows: Vec<ErpRow>,
    /// Open positions (`Insgesamt bestellt` holds a number), sorted by Artikelnummer, then LotId.
    pub offene_posten: Vec<OffenePostenRow>,
    pub debitor: String,
}

/// Parse ERP workbook → stock rows, Offene Posten, and debitor string.
pub fn parse_erp(path: &Path) -> DomainResult<ErpImport> {
    let raw_rows = read_sheet_rows(path, 0)?;
    let debitor = raw_rows
        .first()
        .and_then(|r| r.get("Debitorenkonto"))
        .map(|s| cell_to_string(s))
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| UNBEKANNT.to_string());

    let mut rows = Vec::new();
    let mut offene_posten = Vec::new();
    for row in raw_rows {
        match offen_count(&row) {
            Some(offen) => offene_posten.push(map_offene_posten_row(&row, offen)),
            None => rows.push(map_erp_row(row)),
        }
    }
    offene_posten.sort_by(|a, b| {
        cmp_artikelnummer(&a.artikelnummer, &b.artikelnummer).then_with(|| a.lot_id.cmp(&b.lot_id))
    });

    Ok(ErpImport {
        rows,
        offene_posten,
        debitor,
    })
}

/// Count text from `Insgesamt bestellt`; `None` when the cell holds no number.
fn offen_count(row: &HashMap<String, String>) -> Option<String> {
    row.get(OFFENE_POSTEN_COLUMN)
        .and_then(|raw| normalize_count(raw))
}

fn map_offene_posten_row(row: &HashMap<String, String>, offen: String) -> OffenePostenRow {
    OffenePostenRow {
        artikelnummer: cell_or(row, "Artikelnummer", UNBEKANNT),
        produktname: cell_or(row, "Produktname", UNBEKANNT),
        lot_id: normalize_lot_id(row.get("LotId").map(String::as_str).unwrap_or("")),
        ablaufdatum: cell_or(row, "Ablaufdatum", "-"),
        offen,
        id: Uuid::new_v4().to_string(),
    }
}

fn map_erp_row(mut row: HashMap<String, String>) -> ErpRow {
    let eigenbestand = row
        .remove("Physischer Bestand")
        .or_else(|| row.get("Eigenbestand nach ERP").cloned())
        .unwrap_or_default();

    let kennzeichen_3 = kennzeichen_from_row(&row);
    let lot_id = normalize_lot_id(row.get("LotId").map(String::as_str).unwrap_or(""));
    let artikelnummer = cell_or(&row, "Artikelnummer", UNBEKANNT);
    let produktname = cell_or(&row, "Produktname", UNBEKANNT);
    let ablaufdatum = cell_or(&row, "Ablaufdatum", "-");
    let debitorenkonto = row
        .get("Debitorenkonto")
        .map(|s| cell_to_string(s))
        .unwrap_or_default();

    let mut extra = Vec::new();
    for (key, value) in row {
        if KNOWN_COLUMNS.contains(&key.as_str()) {
            continue;
        }
        if !value.is_empty() {
            extra.push((key, value));
        }
    }
    // Keep renamed stock column visible on Ax-Bestand via typed field only.
    let _ = eigenbestand.clone();

    ErpRow {
        artikelnummer,
        produktname,
        lot_id,
        kennzeichen_3,
        ablaufdatum,
        debitorenkonto,
        eigenbestand_nach_erp: cell_to_string(&eigenbestand),
        extra,
    }
}

/// Trimmed cell value, or `fallback` when the cell is missing or blank.
fn cell_or(row: &HashMap<String, String>, key: &str, fallback: &str) -> String {
    row.get(key)
        .map(|s| cell_to_string(s))
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| fallback.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    fn row_with(cells: &[(&str, &str)]) -> HashMap<String, String> {
        cells
            .iter()
            .map(|(key, value)| (key.to_string(), value.to_string()))
            .collect()
    }

    #[test]
    fn maps_physischer_bestand_rename() {
        let mut row = HashMap::new();
        row.insert("Artikelnummer".into(), "A1".into());
        row.insert("Produktname".into(), "P".into());
        row.insert("LotId".into(), " L1 ".into());
        row.insert("Physischer Bestand".into(), "2".into());
        row.insert("Debitorenkonto".into(), "10521".into());
        row.insert("Kennzeichen".into(), "IMP".into());

        let mapped = map_erp_row(row);
        assert_eq!(mapped.eigenbestand_nach_erp, "2");
        assert_eq!(mapped.lot_id, "L1");
        assert_eq!(mapped.kennzeichen_3, "IMP");
    }

    #[test]
    fn numeric_insgesamt_bestellt_is_offene_posten() {
        let row = row_with(&[("Insgesamt bestellt", "3")]);
        assert_eq!(offen_count(&row), Some("3".to_string()));
    }

    #[test]
    fn blank_or_text_insgesamt_bestellt_is_stock_row() {
        assert_eq!(offen_count(&row_with(&[("Insgesamt bestellt", "")])), None);
        assert_eq!(
            offen_count(&row_with(&[("Insgesamt bestellt", "offen")])),
            None
        );
        assert_eq!(offen_count(&row_with(&[])), None);
    }

    #[test]
    fn offene_posten_row_trims_and_falls_back() {
        let row = row_with(&[
            ("Artikelnummer", " 4711 "),
            ("LotId", " L-9 "),
            ("Insgesamt bestellt", "2"),
        ]);
        let mapped = map_offene_posten_row(&row, "2".to_string());
        assert_eq!(mapped.artikelnummer, "4711");
        assert_eq!(mapped.produktname, UNBEKANNT);
        assert_eq!(mapped.lot_id, "L-9");
        assert_eq!(mapped.ablaufdatum, "-");
        assert_eq!(mapped.offen, "2");
        assert!(!mapped.id.is_empty());
    }
}
