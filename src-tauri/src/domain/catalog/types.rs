//! Catalog DTOs shared by SQLite store, import, and Tauri commands.

use serde::{Deserialize, Serialize};

/// SQLite file name under the app data directory.
pub const CATALOG_DB_FILENAME: &str = "catalogs.sqlite";

/// One debitor directory entry for search / pick UI.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DebitorEntry {
    /// Debitorenkonto / ERP customer id (`ID` column in reference workbook).
    pub debitorenkonto: String,
    /// Display name (`Name` / `Kundenname`).
    pub kundenname: String,
    /// Street / postal address line (`Postanschrift`).
    #[serde(default)]
    pub postanschrift: String,
    /// Postal code (`PLZ`).
    #[serde(default)]
    pub plz: String,
    /// City (`Ort`).
    #[serde(default)]
    pub ort: String,
}

/// Per-sheet insert counters from an import run.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct ImportSheetStats {
    pub inserted: u64,
    pub skipped_existing: u64,
    pub rows_read: u64,
}

/// Result of importing a reference workbook (GTIN + Debitoren sheets).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ImportStats {
    pub source_filename: String,
    pub gtin: ImportSheetStats,
    pub debitor: ImportSheetStats,
}

/// Snapshot of catalog sizes + last import metadata for the UI.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CatalogStats {
    pub gtin_count: u64,
    pub debitor_count: u64,
    pub last_import_filename: Option<String>,
    pub last_import_at: Option<String>,
}

/// Readiness flags for starting a new Inventur from the home screen.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CatalogReady {
    pub gtin_ok: bool,
    pub debitor_ok: bool,
    pub ready: bool,
    pub stats: CatalogStats,
}
