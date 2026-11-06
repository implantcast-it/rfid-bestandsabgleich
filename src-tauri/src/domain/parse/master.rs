//! Inventur-Master parser — sheet 0 is the GTIN product catalog.

use std::path::Path;

use crate::domain::error::{DomainError, DomainResult};
use crate::domain::gtin::GtinCatalog;
use crate::domain::normalize::normalize_gtin;
use crate::domain::parse::excel::read_sheet_rows;
use crate::domain::types::{ProductInfo, UNBEKANNT};

/// Load GTIN → product mappings from Master workbook sheet 0.
///
/// Required columns: `GTIN`. Missing product fields fall back to [`UNBEKANNT`].
/// Duplicate GTINs: first row wins (additive / immutable mapping).
pub fn load_catalog_from_path(path: &Path) -> DomainResult<GtinCatalog> {
    let rows = read_sheet_rows(path, 0)?;
    if rows.is_empty() {
        return Err(DomainError::SheetMissing {
            sheet: "Master sheet 0 (leer)".into(),
        });
    }

    let mut catalog = GtinCatalog::new();
    for row in rows {
        let gtin = normalize_gtin(row.get("GTIN").map(String::as_str).unwrap_or(""));
        if gtin.is_empty() {
            continue;
        }
        let info = ProductInfo {
            artikelnummer: non_empty(row.get("Artikelnummer"), UNBEKANNT),
            produktname: non_empty(row.get("Produktname"), UNBEKANNT),
            kennzeichen_3: kennzeichen_from_row(&row),
        };
        catalog.insert_additive(gtin, info);
    }

    Ok(catalog)
}

fn non_empty(value: Option<&String>, fallback: &str) -> String {
    match value {
        Some(v) if !v.trim().is_empty() => v.trim().to_string(),
        _ => fallback.to_string(),
    }
}

/// Prefer `Kennzeichen 3`, else legacy `Kennzeichen` (ERP/Master variants).
pub fn kennzeichen_from_row(row: &std::collections::HashMap<String, String>) -> String {
    if let Some(v) = row.get("Kennzeichen 3") {
        if !v.trim().is_empty() {
            return v.trim().to_string();
        }
    }
    if let Some(v) = row.get("Kennzeichen") {
        if !v.trim().is_empty() {
            return v.trim().to_string();
        }
    }
    UNBEKANNT.to_string()
}
