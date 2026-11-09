//! Project library CRUD under `{app_data_dir}/projects/{uuid}/`.

use std::fs;
use std::path::Path;

use uuid::Uuid;

use crate::domain::editor::EditorSnapshot;
use crate::domain::projects::io::{
    now_iso, read_draft, read_meta, today_iso, write_draft, write_meta,
};
use crate::domain::projects::paths::{ensure_projects_root, project_dir};
use crate::domain::projects::types::{
    CreateProjectInput, LoadedProject, ProjectMeta, ProjectStatus,
};
use crate::domain::{DomainError, DomainResult};

fn default_title(snapshot: &EditorSnapshot) -> String {
    let name = snapshot.kundenname.trim();
    if !name.is_empty() && name != snapshot.debitor.trim() {
        return name.to_string();
    }
    let debitor = snapshot.debitor.trim();
    if debitor.is_empty() {
        "Inventur".to_string()
    } else {
        debitor.to_string()
    }
}

/// Create a new project directory and persist initial draft + meta.
pub fn create_project(
    app_data_dir: &Path,
    snapshot: &EditorSnapshot,
    input: CreateProjectInput,
) -> DomainResult<ProjectMeta> {
    ensure_projects_root(app_data_dir)?;
    let id = Uuid::new_v4().to_string();
    let dir = project_dir(app_data_dir, &id);
    fs::create_dir_all(&dir).map_err(|source| DomainError::Io {
        path: dir.clone(),
        source,
    })?;

    let inventur_date = input
        .inventur_date
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(today_iso);
    let title = input
        .title
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| default_title(snapshot));

    let meta = ProjectMeta {
        id: id.clone(),
        title,
        debitor: snapshot.debitor.clone(),
        plz: input.plz.unwrap_or_default(),
        ort: input.ort.unwrap_or_default(),
        inventur_date,
        status: ProjectStatus::Open,
        updated_at: now_iso(),
        last_export_at: None,
        stichproben_done: snapshot.stats.stichproben_done,
        stichproben_required: snapshot.stats.stichproben_required,
    };

    write_draft(&dir, snapshot)?;
    write_meta(&dir, &meta)?;
    Ok(meta)
}

/// List all projects (newest `updated_at` first). Skips corrupt folders.
pub fn list_projects(app_data_dir: &Path) -> DomainResult<Vec<ProjectMeta>> {
    let root = ensure_projects_root(app_data_dir)?;
    let mut items = Vec::new();
    let entries = fs::read_dir(&root).map_err(|source| DomainError::Io {
        path: root.clone(),
        source,
    })?;

    for entry in entries {
        let entry = entry.map_err(|source| DomainError::Io {
            path: root.clone(),
            source,
        })?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        match read_meta(&path) {
            Ok(meta) => items.push(meta),
            Err(err) => {
                eprintln!(
                    "Inventur-Projekt übersprungen ({}): {err}",
                    path.display()
                );
            }
        }
    }

    items.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(items)
}

/// Load meta + draft for a project id.
pub fn load_project(app_data_dir: &Path, id: &str) -> DomainResult<LoadedProject> {
    let dir = project_dir(app_data_dir, id);
    if !dir.is_dir() {
        return Err(DomainError::Project(format!(
            "Projekt nicht gefunden: {id}"
        )));
    }
    Ok(LoadedProject {
        meta: read_meta(&dir)?,
        snapshot: read_draft(&dir)?,
    })
}

/// Overwrite draft and refresh meta timestamps / stichproben.
pub fn save_draft(
    app_data_dir: &Path,
    id: &str,
    snapshot: &EditorSnapshot,
) -> DomainResult<ProjectMeta> {
    let dir = project_dir(app_data_dir, id);
    if !dir.is_dir() {
        return Err(DomainError::Project(format!(
            "Projekt nicht gefunden: {id}"
        )));
    }
    let mut meta = read_meta(&dir)?;
    write_draft(&dir, snapshot)?;
    meta.updated_at = now_iso();
    meta.stichproben_done = snapshot.stats.stichproben_done;
    meta.stichproben_required = snapshot.stats.stichproben_required;
    meta.debitor = snapshot.debitor.clone();
    if meta.title.trim().is_empty() {
        meta.title = default_title(snapshot);
    }
    write_meta(&dir, &meta)?;
    Ok(meta)
}

/// Update lifecycle status (and last_export_at when marking exported).
pub fn update_status(
    app_data_dir: &Path,
    id: &str,
    status: ProjectStatus,
) -> DomainResult<ProjectMeta> {
    let dir = project_dir(app_data_dir, id);
    if !dir.is_dir() {
        return Err(DomainError::Project(format!(
            "Projekt nicht gefunden: {id}"
        )));
    }
    let mut meta = read_meta(&dir)?;
    meta.status = status;
    meta.updated_at = now_iso();
    if status == ProjectStatus::Exported {
        meta.last_export_at = Some(now_iso());
    }
    write_meta(&dir, &meta)?;
    Ok(meta)
}

/// Update hub display title (user annotation); does not change debitor.
pub fn update_title(
    app_data_dir: &Path,
    id: &str,
    title: &str,
) -> DomainResult<ProjectMeta> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err(DomainError::Project(
            "Titel darf nicht leer sein".into(),
        ));
    }
    let dir = project_dir(app_data_dir, id);
    if !dir.is_dir() {
        return Err(DomainError::Project(format!(
            "Projekt nicht gefunden: {id}"
        )));
    }
    let mut meta = read_meta(&dir)?;
    meta.title = trimmed.to_string();
    meta.updated_at = now_iso();
    write_meta(&dir, &meta)?;
    Ok(meta)
}

/// Delete project directory recursively.
pub fn delete_project(app_data_dir: &Path, id: &str) -> DomainResult<()> {
    let dir = project_dir(app_data_dir, id);
    if !dir.exists() {
        return Ok(());
    }
    fs::remove_dir_all(&dir).map_err(|source| DomainError::Io {
        path: dir,
        source,
    })?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::editor::EditorStats;
    use pretty_assertions::assert_eq;
    use tempfile::tempdir;

    fn sample_snapshot() -> EditorSnapshot {
        EditorSnapshot {
            debitor: "45120".into(),
            kundenname: "Klinikum Nord".into(),
            lot_id_rows: vec![],
            art_nr_rows: vec![],
            ax_bestand: vec![],
            rfid_scan: vec![],
            offene_posten: vec![],
            dirty: false,
            edited_ids: vec![],
            stats: EditorStats {
                abweichungen: 0,
                offene_todos: 0,
                stichproben_done: 3,
                stichproben_required: 5,
                erp_quantity_total: 450,
            },
        }
    }

    #[test]
    fn create_list_save_load_delete_roundtrip() {
        let tmp = tempdir().unwrap();
        let root = tmp.path();
        let snap = sample_snapshot();

        let meta = create_project(
            root,
            &snap,
            CreateProjectInput {
                plz: Some("20095".into()),
                ort: Some("Hamburg".into()),
                ..Default::default()
            },
        )
        .unwrap();

        assert_eq!(meta.title, "Klinikum Nord");
        assert_eq!(meta.plz, "20095");
        assert_eq!(meta.status, ProjectStatus::Open);
        assert_eq!(meta.stichproben_done, 3);
        assert_eq!(meta.stichproben_required, 5);

        let listed = list_projects(root).unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].id, meta.id);

        let mut dirty = snap.clone();
        dirty.dirty = true;
        dirty.stats.stichproben_done = 7;
        dirty.stats.stichproben_required = 5;
        let saved = save_draft(root, &meta.id, &dirty).unwrap();
        assert_eq!(saved.stichproben_done, 7);
        assert_eq!(saved.stichproben_required, 5);

        let loaded = load_project(root, &meta.id).unwrap();
        assert!(loaded.snapshot.dirty);
        assert_eq!(loaded.snapshot.stats.stichproben_done, 7);
        assert_eq!(loaded.snapshot.stats.stichproben_required, 5);

        let exported = update_status(root, &meta.id, ProjectStatus::Exported).unwrap();
        assert_eq!(exported.status, ProjectStatus::Exported);
        assert!(exported.last_export_at.is_some());

        let renamed = update_title(root, &meta.id, "  Nord · EG  ").unwrap();
        assert_eq!(renamed.title, "Nord · EG");
        assert!(update_title(root, &meta.id, "   ").is_err());

        delete_project(root, &meta.id).unwrap();
        assert!(list_projects(root).unwrap().is_empty());
    }
}
