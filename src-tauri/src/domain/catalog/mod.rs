//! Local reference catalogs (GTIN + Debitor) stored in SQLite under app data.
//!
//! Operators import **one** Excel workbook with two sheets (`GTIN` + `Debitoren`).
//! Real customer data must never be committed to the public repo — only synthetic
//! fixtures for tests. Production catalogs live only on the device.

mod db;
mod import;
mod types;

pub use db::{kundenname_or_unknown, CatalogDb};
pub use import::import_reference_workbook;
pub use types::{
    CatalogReady, CatalogStats, DebitorEntry, ImportSheetStats, ImportStats, CATALOG_DB_FILENAME,
};
