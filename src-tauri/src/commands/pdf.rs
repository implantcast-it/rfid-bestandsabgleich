//! PDF IPC: Abgleich export and blank Bestätigungsformular.

use crate::commands::domain_err;
use crate::domain::pdf::{render_abgleich_pdf, render_bestaetigung_pdf, PdfExportInput};

/// Render landscape Bestandsabgleich PDF (LotId table only).
/// Returns raw PDF bytes for the frontend save dialog + `writeFile`.
#[tauri::command]
pub fn export_abgleich_pdf(input: PdfExportInput) -> Result<Vec<u8>, String> {
    render_abgleich_pdf(&input).map_err(domain_err)
}

/// Render a blank Bestätigungsformular PDF for printing form stacks.
#[tauri::command]
pub fn export_bestaetigung_pdf() -> Result<Vec<u8>, String> {
    render_bestaetigung_pdf().map_err(domain_err)
}
