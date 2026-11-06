//! Tauri commands exposing catalog, inventur compare, and PDF export to the React UI.

use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::domain::catalog::{
    import_reference_workbook, CatalogDb, CatalogReady, CatalogStats, DebitorEntry, ImportStats,
};
use crate::domain::editor::EditorSnapshot;
use crate::domain::inventur::{self, catalog_ready_from_stats};
use crate::domain::pdf::{render_abgleich_pdf, render_bestaetigung_pdf, PdfExportInput};
use crate::domain::projects::{
    self, CreateProjectInput, LoadedProject, ProjectMeta, ProjectStatus,
};
use crate::domain::DomainError;

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("App-Datenverzeichnis nicht verfügbar: {e}"))
}

fn open_db(app: &AppHandle) -> Result<CatalogDb, String> {
    let dir = app_data_dir(app)?;
    CatalogDb::open(&dir).map_err(domain_err)
}

fn domain_err(err: DomainError) -> String {
    err.to_string()
}

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

/// Create an inventur project under app data and return its meta.
#[tauri::command]
pub fn create_inventur_project(
    app: AppHandle,
    snapshot: EditorSnapshot,
    input: Option<CreateProjectInput>,
) -> Result<ProjectMeta, String> {
    let dir = app_data_dir(&app)?;
    projects::create_project(&dir, &snapshot, input.unwrap_or_default()).map_err(domain_err)
}

/// List inventur projects for the home hub (newest first).
#[tauri::command]
pub fn list_inventur_projects(app: AppHandle) -> Result<Vec<ProjectMeta>, String> {
    let dir = app_data_dir(&app)?;
    projects::list_projects(&dir).map_err(domain_err)
}

/// Load inventur meta + draft snapshot by project id.
#[tauri::command]
pub fn load_inventur_draft(app: AppHandle, id: String) -> Result<LoadedProject, String> {
    let dir = app_data_dir(&app)?;
    projects::load_project(&dir, &id).map_err(domain_err)
}

/// Persist an updated editor snapshot (autosave / Speichern).
#[tauri::command]
pub fn save_inventur_draft(
    app: AppHandle,
    id: String,
    snapshot: EditorSnapshot,
) -> Result<ProjectMeta, String> {
    let dir = app_data_dir(&app)?;
    projects::save_draft(&dir, &id, &snapshot).map_err(domain_err)
}

/// Update inventur project status (`open` | `exported` | `done`).
#[tauri::command]
pub fn update_inventur_status(
    app: AppHandle,
    id: String,
    status: ProjectStatus,
) -> Result<ProjectMeta, String> {
    let dir = app_data_dir(&app)?;
    projects::update_status(&dir, &id, status).map_err(domain_err)
}

/// Update inventur hub display title (user annotation).
#[tauri::command]
pub fn update_inventur_title(
    app: AppHandle,
    id: String,
    title: String,
) -> Result<ProjectMeta, String> {
    let dir = app_data_dir(&app)?;
    projects::update_title(&dir, &id, &title).map_err(domain_err)
}

/// Delete an inventur project from app data.
#[tauri::command]
pub fn delete_inventur_project(app: AppHandle, id: String) -> Result<(), String> {
    let dir = app_data_dir(&app)?;
    projects::delete_project(&dir, &id).map_err(domain_err)
}
