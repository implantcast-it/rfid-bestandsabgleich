//! JSON read/write for project meta and draft files.

use std::fs;
use std::path::Path;

use chrono::Local;
use serde::{Deserialize, Serialize};

use crate::domain::editor::EditorSnapshot;
use crate::domain::projects::paths::{DRAFT_FILE, META_FILE};
use crate::domain::projects::types::ProjectMeta;
use crate::domain::{DomainError, DomainResult};

pub(crate) fn now_iso() -> String {
    Local::now().to_rfc3339()
}

pub(crate) fn today_iso() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

pub(crate) fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> DomainResult<T> {
    let raw = fs::read_to_string(path).map_err(|source| DomainError::Io {
        path: path.to_path_buf(),
        source,
    })?;
    serde_json::from_str(&raw).map_err(|e| {
        DomainError::Project(format!(
            "Datei ungültig ({}): {e}",
            path.display()
        ))
    })
}

pub(crate) fn write_json<T: Serialize>(path: &Path, value: &T) -> DomainResult<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|source| DomainError::Io {
            path: parent.to_path_buf(),
            source,
        })?;
    }
    let raw = serde_json::to_string_pretty(value).map_err(|e| {
        DomainError::Project(format!("Serialisierung fehlgeschlagen: {e}"))
    })?;
    fs::write(path, raw).map_err(|source| DomainError::Io {
        path: path.to_path_buf(),
        source,
    })
}

pub(crate) fn read_meta(dir: &Path) -> DomainResult<ProjectMeta> {
    read_json(&dir.join(META_FILE))
}

pub(crate) fn write_meta(dir: &Path, meta: &ProjectMeta) -> DomainResult<()> {
    write_json(&dir.join(META_FILE), meta)
}

pub(crate) fn write_draft(dir: &Path, snapshot: &EditorSnapshot) -> DomainResult<()> {
    write_json(&dir.join(DRAFT_FILE), snapshot)
}

pub(crate) fn read_draft(dir: &Path) -> DomainResult<EditorSnapshot> {
    read_json(&dir.join(DRAFT_FILE))
}
