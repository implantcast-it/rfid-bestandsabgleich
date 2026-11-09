//! App-managed inventur project library under `{app_data_dir}/projects/{uuid}/`.
//!
//! Each project stores `meta.json` (hub card) + `draft.json` (`EditorSnapshot`).

mod io;
mod paths;
mod store;
mod types;

pub use store::{
    create_project, delete_project, list_projects, load_project, save_draft, update_status,
    update_title,
};
pub use types::{CreateProjectInput, LoadedProject, ProjectMeta, ProjectStatus};
