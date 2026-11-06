//! Import GTIN + Debitor sheets from a **single** reference Excel workbook.
//!
//! ## Expected workbook layout
//!
//! | Sheet name (aliases) | Role |
//! |----------------------|------|
//! | `GTIN` (`Master`, `GTIN-Liste`) | Product enrichment map |
//! | `DEBITOREN` (`Debitoren`, `Debitor`, `Kunden`) | Debitorenkonto → Name + address |
//!
//! ### GTIN columns (order irrelevant; matched by header name)
//! `Artikelnummer`, `GTIN` (required), `Kennzeichen 3` (or `Kennzeichen`), `Produktname`
//!
//! ### Debitoren columns (current format)
//! `ID`, `Name`, `Postanschrift`, `PLZ`, `Ort`
//!
//! Legacy aliases still accepted for id/name:
//! `Debitorenkonto` / `Debitor` / `Kundennummer` + `Kundenname` / `Kunde`
//!
//! Import is **additive**: existing primary keys are never overwritten.

use std::path::Path;

use crate::domain::catalog::db::CatalogDb;
use crate::domain::catalog::types::{DebitorEntry, ImportSheetStats, ImportStats};
use crate::domain::error::{DomainError, DomainResult};
use crate::domain::normalize::{cell_to_string, normalize_gtin};
use crate::domain::parse::excel::{open_workbook, range_to_rows};
use crate::domain::parse::kennzeichen_from_row;
use crate::domain::types::{ProductInfo, UNBEKANNT};
use calamine::Reader;

const GTIN_SHEET_ALIASES: &[&str] = &["GTIN", "Master", "GTIN-Liste", "GTIN Liste"];
const DEBITOR_SHEET_ALIASES: &[&str] = &[
    "DEBITOREN",
    "Debitoren",
    "Debitor",
    "Kunden",
    "Debitorenliste",
];

const DEBITOR_ID_ALIASES: &[&str] = &[
    "ID",
    "Debitorenkonto",
    "Debitor",
    "Debitor-Nr",
    "Debitor Nr",
    "Kundennummer",
];
const DEBITOR_NAME_ALIASES: &[&str] = &["Name", "Kundenname", "Debitorenname", "Kunde"];
const DEBITOR_STREET_ALIASES: &[&str] = &["Postanschrift", "Straße", "Strasse", "Adresse"];
const DEBITOR_PLZ_ALIASES: &[&str] = &["PLZ", "Postleitzahl"];
const DEBITOR_ORT_ALIASES: &[&str] = &["Ort", "Stadt", "City"];

/// Parse both sheets from `xlsx_path` and upsert into `db` (additive).
pub fn import_reference_workbook(db: &CatalogDb, xlsx_path: &Path) -> DomainResult<ImportStats> {
    if !xlsx_path.exists() {
        return Err(DomainError::FileNotFound(xlsx_path.to_path_buf()));
    }

    let mut workbook = open_workbook(xlsx_path)?;
    let sheet_names = workbook.sheet_names().to_owned();

    let gtin_sheet = find_sheet(&sheet_names, GTIN_SHEET_ALIASES).ok_or_else(|| {
        DomainError::CatalogImport(format!(
            "GTIN-Tabelle nicht gefunden. Erwartet einen der Namen: {}. Vorhanden: {}",
            GTIN_SHEET_ALIASES.join(", "),
            sheet_names.join(", ")
        ))
    })?;
    let debitor_sheet = find_sheet(&sheet_names, DEBITOR_SHEET_ALIASES).ok_or_else(|| {
        DomainError::CatalogImport(format!(
            "Debitoren-Tabelle nicht gefunden. Erwartet einen der Namen: {}. Vorhanden: {}",
            DEBITOR_SHEET_ALIASES.join(", "),
            sheet_names.join(", ")
        ))
    })?;

    let gtin_rows = {
        let range = workbook
            .worksheet_range(gtin_sheet)
            .map_err(|e| DomainError::ExcelOpen {
                path: xlsx_path.to_path_buf(),
                message: e.to_string(),
            })?;
        range_to_rows(&range, gtin_sheet)?
    };
    let debitor_rows = {
        let range = workbook
            .worksheet_range(debitor_sheet)
            .map_err(|e| DomainError::ExcelOpen {
                path: xlsx_path.to_path_buf(),
                message: e.to_string(),
            })?;
        range_to_rows(&range, debitor_sheet)?
    };

    let mut gtin_stats = ImportSheetStats::default();
    let gtin_iter = gtin_rows.into_iter().filter_map(|row| {
        let gtin = normalize_gtin(row.get("GTIN").map(String::as_str).unwrap_or(""));
        if gtin.is_empty() {
            return None;
        }
        let info = ProductInfo {
            artikelnummer: non_empty(row.get("Artikelnummer"), UNBEKANNT),
            produktname: non_empty(row.get("Produktname"), UNBEKANNT),
            kennzeichen_3: kennzeichen_from_row(&row),
        };
        Some((gtin, info))
    });
    db.import_gtin_rows(gtin_iter, &mut gtin_stats)?;

    let mut debitor_stats = ImportSheetStats::default();
    let debitor_iter = debitor_rows.into_iter().filter_map(|row| {
        let konto = first_alias(&row, DEBITOR_ID_ALIASES)?;
        let name = first_alias(&row, DEBITOR_NAME_ALIASES)?;
        if konto.is_empty() || name.is_empty() {
            return None;
        }
        Some(DebitorEntry {
            debitorenkonto: konto,
            kundenname: name,
            postanschrift: first_alias(&row, DEBITOR_STREET_ALIASES).unwrap_or_default(),
            plz: first_alias(&row, DEBITOR_PLZ_ALIASES).unwrap_or_default(),
            ort: first_alias(&row, DEBITOR_ORT_ALIASES).unwrap_or_default(),
        })
    });
    db.import_debitor_rows(debitor_iter, &mut debitor_stats)?;

    let filename = xlsx_path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("katalog.xlsx")
        .to_string();
    db.set_meta("last_import_filename", &filename)?;
    db.set_meta("last_import_at", &chrono::Local::now().to_rfc3339())?;

    Ok(ImportStats {
        source_filename: filename,
        gtin: gtin_stats,
        debitor: debitor_stats,
    })
}

fn find_sheet<'a>(names: &'a [String], aliases: &[&str]) -> Option<&'a str> {
    for alias in aliases {
        if let Some(found) = names.iter().find(|n| n.eq_ignore_ascii_case(alias)) {
            return Some(found.as_str());
        }
    }
    None
}

fn first_alias(
    row: &std::collections::HashMap<String, String>,
    aliases: &[&str],
) -> Option<String> {
    for alias in aliases {
        if let Some(v) = row.get(*alias) {
            let t = cell_to_string(v);
            if !t.is_empty() {
                return Some(t);
            }
        }
        // Case-insensitive header match
        for (key, value) in row {
            if key.eq_ignore_ascii_case(alias) {
                let t = cell_to_string(value);
                if !t.is_empty() {
                    return Some(t);
                }
            }
        }
    }
    None
}

fn non_empty(value: Option<&String>, fallback: &str) -> String {
    match value {
        Some(v) if !v.trim().is_empty() => v.trim().to_string(),
        _ => fallback.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::catalog::CatalogDb;
    use pretty_assertions::assert_eq;
    use rust_xlsxwriter::Workbook;
    use tempfile::TempDir;

    fn write_legacy_reference_xlsx(path: &Path) {
        let mut wb = Workbook::new();
        let gtin = wb.add_worksheet();
        gtin.set_name("GTIN").unwrap();
        for (c, h) in ["Artikelnummer", "GTIN", "Kennzeichen 3", "Produktname"]
            .iter()
            .enumerate()
        {
            gtin.write_string(0, c as u16, *h).unwrap();
        }
        gtin.write_string(1, 0, "100").unwrap();
        gtin.write_string(1, 1, "04048844149895").unwrap();
        gtin.write_string(1, 2, "IMP").unwrap();
        gtin.write_string(1, 3, "Implant A").unwrap();

        let deb = wb.add_worksheet();
        deb.set_name("Debitoren").unwrap();
        deb.write_string(0, 0, "Debitorenkonto").unwrap();
        deb.write_string(0, 1, "Kundenname").unwrap();
        deb.write_string(1, 0, "10521").unwrap();
        deb.write_string(1, 1, "Klinikum Nord").unwrap();
        deb.write_string(2, 0, "99999").unwrap();
        deb.write_string(2, 1, "Ortho Test").unwrap();
        wb.save(path).unwrap();
    }

    fn write_current_reference_xlsx(path: &Path) {
        let mut wb = Workbook::new();
        let gtin = wb.add_worksheet();
        gtin.set_name("GTIN").unwrap();
        for (c, h) in ["Artikelnummer", "GTIN", "Kennzeichen 3", "Produktname"]
            .iter()
            .enumerate()
        {
            gtin.write_string(0, c as u16, *h).unwrap();
        }
        gtin.write_string(1, 0, "100").unwrap();
        gtin.write_string(1, 1, "04048844149895").unwrap();
        gtin.write_string(1, 2, "IMP").unwrap();
        gtin.write_string(1, 3, "Implant A").unwrap();

        let deb = wb.add_worksheet();
        deb.set_name("DEBITOREN").unwrap();
        for (c, h) in ["ID", "Name", "Postanschrift", "PLZ", "Ort"]
            .iter()
            .enumerate()
        {
            deb.write_string(0, c as u16, *h).unwrap();
        }
        deb.write_string(1, 0, "10521").unwrap();
        deb.write_string(1, 1, "Klinikum Nord").unwrap();
        deb.write_string(1, 2, "Musterweg 12").unwrap();
        deb.write_string(1, 3, "80331").unwrap();
        deb.write_string(1, 4, "München").unwrap();
        deb.write_string(2, 0, "99999").unwrap();
        deb.write_string(2, 1, "Ortho Test").unwrap();
        deb.write_string(2, 2, "Klinikstr. 3").unwrap();
        deb.write_string(2, 3, "10115").unwrap();
        deb.write_string(2, 4, "Berlin").unwrap();
        wb.save(path).unwrap();
    }

    #[test]
    fn imports_both_sheets_additively() {
        let dir = TempDir::new().unwrap();
        let xlsx = dir.path().join("ref.xlsx");
        write_legacy_reference_xlsx(&xlsx);
        let db = CatalogDb::open(dir.path()).unwrap();

        let stats = import_reference_workbook(&db, &xlsx).unwrap();
        assert_eq!(stats.gtin.inserted, 1);
        assert_eq!(stats.debitor.inserted, 2);

        let again = import_reference_workbook(&db, &xlsx).unwrap();
        assert_eq!(again.gtin.inserted, 0);
        assert_eq!(again.gtin.skipped_existing, 1);
        assert_eq!(again.debitor.skipped_existing, 2);

        let stats = db.stats().unwrap();
        assert_eq!(stats.gtin_count, 1);
        assert_eq!(stats.debitor_count, 2);
        assert_eq!(
            db.resolve_debitor("10521").unwrap().as_deref(),
            Some("Klinikum Nord")
        );
    }

    #[test]
    fn imports_id_name_address_format() {
        let dir = TempDir::new().unwrap();
        let xlsx = dir.path().join("ref-current.xlsx");
        write_current_reference_xlsx(&xlsx);
        let db = CatalogDb::open(dir.path()).unwrap();

        let stats = import_reference_workbook(&db, &xlsx).unwrap();
        assert_eq!(stats.gtin.inserted, 1);
        assert_eq!(stats.debitor.inserted, 2);

        let hits = db.search_debitors("10521", 5).unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].kundenname, "Klinikum Nord");
        assert_eq!(hits[0].postanschrift, "Musterweg 12");
        assert_eq!(hits[0].plz, "80331");
        assert_eq!(hits[0].ort, "München");

        let by_city = db.search_debitors("Berlin", 5).unwrap();
        assert_eq!(by_city.len(), 1);
        assert_eq!(by_city[0].debitorenkonto, "99999");
    }
}
