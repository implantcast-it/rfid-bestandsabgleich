//! Editor-side pure rules and inventur draft session.
//!
//! ## Layers
//!
//! | Module | Role |
//! |--------|------|
//! | [`aggregate`] | LotId → ArtNr (sum of presence flags) |
//! | [`auto_kommentare`] / [`auto_siebe`] | Auto-actions (parity with EditorScreen) |
//! | [`vocabulary`] | Controlled To Do / Anmerkung lists |
//! | [`draft`] | **Session API**: patches, bulk edit, snapshot, export |
//!
//! LotId rows are the only editable inventur data. ArtNr is always derived.
//! UI wiring (Tauri / TanStack) is deferred; React still owns live handlers today.

mod aggregate;
mod auto_kommentare;
mod auto_siebe;
mod draft;
mod helpers;
pub mod vocabulary;

pub use aggregate::aggregate_art_nr_from_lot_id;
pub use auto_kommentare::{auto_fill_kommentare, AutoKommentareResult};
pub use auto_siebe::{auto_siebe_and_offene_posten, AutoSiebeResult};
pub use draft::{
    EditorSnapshot, EditorStats, InventurDraft, LotIdEditField, LotIdPatch,
};
pub use helpers::{erp_quantity_as_u32, stichproben_required_from_erp_total};
