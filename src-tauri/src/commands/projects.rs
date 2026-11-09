//! Projects IPC: inventur library CRUD under app data.

use tauri::AppHandle;

use crate::commands::{app_data_dir, domain_err};
use crate::domain::editor::EditorSnapshot;
use crate::domain::projects::{
    self, CreateProjectInput, LoadedProject, ProjectMeta, ProjectStatus,
};

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
