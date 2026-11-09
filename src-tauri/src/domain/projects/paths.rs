//! Project library path helpers under `{app_data_dir}/projects/{uuid}/`.

use std::fs;
use std::path::{Path, PathBuf};

use crate::domain::{DomainError, DomainResult};

pub(crate) const PROJECTS_DIR: &str = "projects";
pub(crate) const META_FILE: &str = "meta.json";
pub(crate) const DRAFT_FILE: &str = "draft.json";

pub(crate) fn projects_root(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(PROJECTS_DIR)
}

pub(crate) fn project_dir(app_data_dir: &Path, id: &str) -> PathBuf {
    projects_root(app_data_dir).join(id)
}

pub(crate) fn ensure_projects_root(app_data_dir: &Path) -> DomainResult<PathBuf> {
    let root = projects_root(app_data_dir);
    fs::create_dir_all(&root).map_err(|source| DomainError::Io {
        path: root.clone(),
        source,
    })?;
    Ok(root)
}
