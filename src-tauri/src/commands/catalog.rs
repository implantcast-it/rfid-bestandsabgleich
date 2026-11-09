//! Catalog IPC: import, stats, readiness, debitor search.

use std::path::PathBuf;

use tauri::AppHandle;

use crate::commands::{domain_err, open_db};
use crate::domain::catalog::{
    import_reference_workbook, CatalogReady, CatalogStats, DebitorEntry, ImportStats,
};
use crate::domain::inventur::catalog_ready_from_stats;

/// Import GTIN + Debitoren sheets from one Excel file into local SQLite.
#[tauri::command]
pub fn import_reference_catalog(app: AppHandle, path: String) -> Result<ImportStats, String> {
    let db = open_db(&app)?;
    import_reference_workbook(&db, PathBuf::from(path).as_path()).map_err(domain_err)
}

/// Return catalog sizes and last import metadata.
#[tauri::command]
pub fn get_catalog_stats(app: AppHandle) -> Result<CatalogStats, String> {
    open_db(&app)?.stats().map_err(domain_err)
}

/// Readiness for starting a new Inventur (GTIN + Debitor catalogs non-empty).
#[tauri::command]
pub fn catalog_ready(app: AppHandle) -> Result<CatalogReady, String> {
    let stats = open_db(&app)?.stats().map_err(domain_err)?;
    Ok(catalog_ready_from_stats(stats))
}

/// Search debitors by id or name (typeahead).
#[tauri::command]
pub fn search_debitors(
    app: AppHandle,
    query: String,
    limit: Option<u32>,
) -> Result<Vec<DebitorEntry>, String> {
    let lim = limit.unwrap_or(20) as usize;
    open_db(&app)?
        .search_debitors(&query, lim)
        .map_err(domain_err)
}
