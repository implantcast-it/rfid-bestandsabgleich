//! Editor-side pure rules and inventur draft session.
//!
//! ## Layers
//!
//! | Module | Role |
//! |--------|------|
//! | [`aggregate`] | LotId → ArtNr (sum of presence flags) |
//! | [`auto_kommentare`] / [`auto_siebe`] | Auto-actions (SIEB/INST + paired To Dos) |
//! | [`vocabulary`] | Controlled To Do / Anmerkung lists |
//! | [`types`] | Serde DTOs for patches / snapshot / stats |
//! | [`draft`] | **Session API**: patches, bulk edit, snapshot, export |
//!
//! LotId rows are the only editable inventur data. ArtNr is always derived.
//! Auto-Kommentare / Auto-SIEB run via Tauri commands; React keeps live grid state.

mod aggregate;
mod auto_kommentare;
mod auto_siebe;
mod draft;
mod helpers;
mod normalize_patch;
mod stats;
mod types;
pub mod vocabulary;

pub use aggregate::aggregate_art_nr_from_lot_id;
pub use auto_kommentare::{auto_fill_kommentare, AutoKommentareResult};
pub use auto_siebe::{auto_siebe, AutoSiebeResult};
pub use draft::InventurDraft;
pub use helpers::{erp_quantity_as_u32, stichproben_required_from_erp_total};
pub use types::{EditorSnapshot, EditorStats, LotIdEditField, LotIdPatch};
