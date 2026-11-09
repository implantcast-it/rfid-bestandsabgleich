//! Inventur IPC: run compare and reload Abgleich workbooks.

use std::path::PathBuf;

use tauri::AppHandle;
use tauri::ipc::Channel;

use crate::commands::{domain_err, open_db};
use crate::domain::editor::EditorSnapshot;
use crate::domain::inventur::{self, InventurProgressEvent};

/// Parse ERP + RFID against the on-device GTIN catalog and return an editor snapshot.
///
/// `on_progress` receives real pipeline stages so the UI can mark where a failure occurred.
#[tauri::command]
pub fn run_inventur(
    app: AppHandle,
    erp_path: String,
    rfid_path: String,
    on_progress: Channel<InventurProgressEvent>,
) -> Result<EditorSnapshot, String> {
    let db = open_db(&app)?;
    inventur::run_inventur_with_progress(
        &db,
        PathBuf::from(erp_path).as_path(),
        PathBuf::from(rfid_path).as_path(),
        |event| {
            let _ = on_progress.send(event);
        },
    )
    .map_err(domain_err)
}

/// Load a previously exported Abgleich workbook into an editor snapshot.
#[tauri::command]
pub fn load_abgleich(app: AppHandle, path: String) -> Result<EditorSnapshot, String> {
    let db = open_db(&app)?;
    inventur::load_abgleich(&db, PathBuf::from(path).as_path()).map_err(domain_err)
}
