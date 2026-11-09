//! Inventur IPC: run compare and reload Abgleich workbooks.

use std::path::PathBuf;

use tauri::AppHandle;

use crate::commands::{domain_err, open_db};
use crate::domain::editor::EditorSnapshot;
use crate::domain::inventur;

/// Parse ERP + RFID against the on-device GTIN catalog and return an editor snapshot.
#[tauri::command]
pub fn run_inventur(
    app: AppHandle,
    erp_path: String,
    rfid_path: String,
) -> Result<EditorSnapshot, String> {
    let db = open_db(&app)?;
    inventur::run_inventur(
        &db,
        PathBuf::from(erp_path).as_path(),
        PathBuf::from(rfid_path).as_path(),
    )
    .map_err(domain_err)
}

/// Load a previously exported Abgleich workbook into an editor snapshot.
#[tauri::command]
pub fn load_abgleich(app: AppHandle, path: String) -> Result<EditorSnapshot, String> {
    let db = open_db(&app)?;
    inventur::load_abgleich(&db, PathBuf::from(path).as_path()).map_err(domain_err)
}
