//! Project library DTOs (hub cards + draft load payload).

use serde::{Deserialize, Serialize};

use crate::domain::editor::EditorSnapshot;

/// Hub / lifecycle status for an inventur project.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProjectStatus {
    Open,
    Exported,
    Done,
}

impl ProjectStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::Exported => "exported",
            Self::Done => "done",
        }
    }
}

/// Metadata shown on inventuren hub cards.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProjectMeta {
    pub id: String,
    pub title: String,
    pub debitor: String,
    pub plz: String,
    pub ort: String,
    /// Inventurdatum as ISO `YYYY-MM-DD`.
    pub inventur_date: String,
    pub status: ProjectStatus,
    /// ISO-8601 timestamp of last draft write.
    pub updated_at: String,
    /// Optional last Excel/PDF export timestamp.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_export_at: Option<String>,
    /// Stichproben done count at last save (for hub subtitle).
    #[serde(default)]
    pub stichproben_done: u32,
    /// Mandatory Stichproben quota (ceil 1% of Ax ERP qty) at last save.
    #[serde(default)]
    pub stichproben_required: u32,
}

/// Optional fields supplied when creating a project (plz/ort from catalog).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CreateProjectInput {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub plz: Option<String>,
    #[serde(default)]
    pub ort: Option<String>,
    #[serde(default)]
    pub inventur_date: Option<String>,
}

/// Draft + meta returned when opening a project.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadedProject {
    pub meta: ProjectMeta,
    pub snapshot: EditorSnapshot,
}
