//! Excel IPC: Abgleich workbook bytes for the frontend save dialog.

use crate::commands::domain_err;
use crate::domain::editor::{EditorSnapshot, InventurDraft};

/// Build Abgleich `.xlsx` bytes from a live editor snapshot.
///
/// ArtNr is re-aggregated from LotId (source of truth). Raw Ax/RFID/Offene Posten
/// sheets pass through unchanged.
#[tauri::command]
pub fn export_abgleich_xlsx(snapshot: EditorSnapshot) -> Result<Vec<u8>, String> {
    InventurDraft::from_snapshot(snapshot)
        .write_xlsx_bytes()
        .map_err(domain_err)
}
