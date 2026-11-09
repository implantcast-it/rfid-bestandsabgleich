//! RFID scan TXT parser.
//!
//! Real device exports look like:
//! ```text
//! [Inventory 22.08.2025 13:25]
//! 04048844149895,1047295003,QM,21614,13:26:41
//! ```
//!
//! Fixed columns (no header): `GTIN | LotId | Kennung 1 | Debitorennummer | Erfasst um`
//!
//! Behaviour vs v4:
//! - Rows containing `[` in **any** field are **dropped entirely** (v4 deleted
//!   individual cells and shifted columns — a silent data bug).
//! - Delimiter is sniffed (`,` / `;` / tab).
//! - LotId normalized; enrichment via [`GtinCatalog`] O(1) lookup.
//! - Deduped by LotId (first non-empty wins) after enrichment.

use std::path::Path;

use crate::domain::error::{DomainError, DomainResult};
use crate::domain::gtin::GtinCatalog;
use crate::domain::normalize::{normalize_gtin, normalize_lot_id};
use crate::domain::types::{RfidRow, UNBEKANNT};

/// Parse RFID TXT, enrich from catalog, dedupe by LotId.
pub fn parse_rfid(path: &Path, catalog: &GtinCatalog) -> DomainResult<Vec<RfidRow>> {
    let text = std::fs::read_to_string(path).map_err(|source| DomainError::Io {
        path: path.to_path_buf(),
        source,
    })?;
    parse_rfid_text(&text, path, catalog)
}

/// Parse RFID from an in-memory string (tests / future command payloads).
pub fn parse_rfid_text(
    text: &str,
    path: &Path,
    catalog: &GtinCatalog,
) -> DomainResult<Vec<RfidRow>> {
    let delimiter = sniff_delimiter(text);
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(false)
        .delimiter(delimiter)
        .flexible(true)
        .trim(csv::Trim::All)
        .from_reader(text.as_bytes());

    let mut enriched = Vec::new();
    for (idx, record) in reader.records().enumerate() {
        let record = record.map_err(|e| DomainError::CsvParse {
            path: path.to_path_buf(),
            message: format!("Zeile {}: {e}", idx + 1),
        })?;

        // Drop whole row if any field contains '[' (inventory banner / noise).
        if record.iter().any(|field| field.contains('[')) {
            continue;
        }

        let gtin = normalize_gtin(record.get(0).unwrap_or(""));
        let lot_id = normalize_lot_id(record.get(1).unwrap_or(""));
        let kennung_1 = record.get(2).unwrap_or("").to_string();
        let debitorennummer = record.get(3).unwrap_or("").to_string();
        let erfasst_um = record.get(4).unwrap_or("").to_string();

        // Skip completely empty lines.
        if gtin.is_empty() && lot_id.is_empty() {
            continue;
        }

        let (artikelnummer, produktname, kennzeichen_3) = match catalog.get(&gtin) {
            Some(info) => (
                info.artikelnummer.clone(),
                info.produktname.clone(),
                info.kennzeichen_3.clone(),
            ),
            None => (
                UNBEKANNT.to_string(),
                UNBEKANNT.to_string(),
                UNBEKANNT.to_string(),
            ),
        };

        enriched.push(RfidRow {
            gtin,
            lot_id,
            kennung_1,
            debitorennummer,
            erfasst_um,
            artikelnummer,
            produktname,
            kennzeichen_3,
        });
    }

    Ok(dedupe_by_lot_id(enriched))
}

/// First non-empty LotId wins; empty LotIds are skipped (cannot key a map).
pub fn dedupe_by_lot_id(rows: Vec<RfidRow>) -> Vec<RfidRow> {
    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::new();
    for row in rows {
        if row.lot_id.is_empty() {
            continue;
        }
        if seen.insert(row.lot_id.clone()) {
            out.push(row);
        }
    }
    out
}

/// Prefer the delimiter that appears most on the first usable data line.
fn sniff_delimiter(text: &str) -> u8 {
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.contains('[') {
            continue;
        }
        let commas = trimmed.matches(',').count();
        let semis = trimmed.matches(';').count();
        let tabs = trimmed.matches('\t').count();
        let max = commas.max(semis).max(tabs);
        if max == 0 {
            return b',';
        }
        if commas == max {
            return b',';
        }
        if semis == max {
            return b';';
        }
        return b'\t';
    }
    b','
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::types::ProductInfo;
    use pretty_assertions::assert_eq;
    use std::path::PathBuf;

    fn catalog_with(gtin: &str, art: &str) -> GtinCatalog {
        let mut cat = GtinCatalog::new();
        cat.insert_additive(
            gtin.into(),
            ProductInfo {
                artikelnummer: art.into(),
                produktname: "Prod".into(),
                kennzeichen_3: "IMP".into(),
            },
        );
        cat
    }

    #[test]
    fn drops_bracket_banner_row_without_shifting_columns() {
        let text = "\
[Inventory 22.08.2025 13:25]
04048844149895,1047295003,QM,21614,13:26:41
";
        let cat = catalog_with("04048844149895", "ART-1");
        let rows = parse_rfid_text(text, &PathBuf::from("t.txt"), &cat).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].lot_id, "1047295003");
        assert_eq!(rows[0].artikelnummer, "ART-1");
        assert_eq!(rows[0].kennung_1, "QM");
    }

    #[test]
    fn unknown_gtin_becomes_unbekannt() {
        let text = "999,LOT1,QM,1,12:00:00\n";
        let rows = parse_rfid_text(text, Path::new("t.txt"), &GtinCatalog::new()).unwrap();
        assert_eq!(rows[0].artikelnummer, UNBEKANNT);
        assert_eq!(rows[0].kennzeichen_3, UNBEKANNT);
    }

    #[test]
    fn dedupe_keeps_first_lot() {
        let text = "\
1,LOT1,A,1,12:00:00
1,LOT1,B,1,12:01:00
1,LOT2,C,1,12:02:00
";
        let rows = parse_rfid_text(text, Path::new("t.txt"), &GtinCatalog::new()).unwrap();
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].kennung_1, "A");
        assert_eq!(rows[1].lot_id, "LOT2");
    }

    #[test]
    fn empty_lot_id_skipped_on_dedupe() {
        let text = "1,,QM,1,12:00:00\n";
        let rows = parse_rfid_text(text, Path::new("t.txt"), &GtinCatalog::new()).unwrap();
        assert!(rows.is_empty());
    }
}
