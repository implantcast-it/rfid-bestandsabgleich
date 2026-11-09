//! Tauri commands exposing catalog, inventur compare, PDF, and projects to the React UI.

mod catalog;
mod inventur;
mod pdf;
mod projects;

use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::domain::catalog::CatalogDb;
use crate::domain::DomainError;

// Re-export commands + Tauri handler companions so `generate_handler![commands::…]` stays flat.
pub use catalog::{
    catalog_ready, get_catalog_stats, import_reference_catalog, search_debitors,
    __cmd__catalog_ready, __cmd__get_catalog_stats, __cmd__import_reference_catalog,
    __cmd__search_debitors, __tauri_command_name_catalog_ready, __tauri_command_name_get_catalog_stats,
    __tauri_command_name_import_reference_catalog, __tauri_command_name_search_debitors,
};
pub use inventur::{
    load_abgleich, run_inventur, __cmd__load_abgleich, __cmd__run_inventur,
    __tauri_command_name_load_abgleich, __tauri_command_name_run_inventur,
};
pub use pdf::{
    export_abgleich_pdf, export_bestaetigung_pdf, __cmd__export_abgleich_pdf,
    __cmd__export_bestaetigung_pdf, __tauri_command_name_export_abgleich_pdf,
    __tauri_command_name_export_bestaetigung_pdf,
};
pub use projects::{
    create_inventur_project, delete_inventur_project, list_inventur_projects, load_inventur_draft,
    save_inventur_draft, update_inventur_status, update_inventur_title,
    __cmd__create_inventur_project, __cmd__delete_inventur_project, __cmd__list_inventur_projects,
    __cmd__load_inventur_draft, __cmd__save_inventur_draft, __cmd__update_inventur_status,
    __cmd__update_inventur_title, __tauri_command_name_create_inventur_project,
    __tauri_command_name_delete_inventur_project, __tauri_command_name_list_inventur_projects,
    __tauri_command_name_load_inventur_draft, __tauri_command_name_save_inventur_draft,
    __tauri_command_name_update_inventur_status, __tauri_command_name_update_inventur_title,
};

pub(crate) fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("App-Datenverzeichnis nicht verfügbar: {e}"))
}

pub(crate) fn open_db(app: &AppHandle) -> Result<CatalogDb, String> {
    let dir = app_data_dir(app)?;
    CatalogDb::open(&dir).map_err(domain_err)
}

pub(crate) fn domain_err(err: DomainError) -> String {
    err.to_string()
}
