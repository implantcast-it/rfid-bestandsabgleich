//! Library crate for the RFID Bestandsabgleich domain engine.
//!
//! Parse, normalize, compare, editor draft, and export live here so they can be
//! unit-tested without the Tauri UI. React wiring is intentionally deferred.

pub mod commands;
pub mod domain;

pub use domain::{
    compare::run_compare,
    editor::{
        aggregate_art_nr_from_lot_id, auto_fill_kommentare, auto_siebe,
        AutoKommentareResult, AutoSiebeResult, EditorSnapshot, EditorStats, InventurDraft,
        LotIdEditField, LotIdPatch,
    },
    export::write_abgleich_xlsx,
    gtin::{load_gtin_catalog, GtinCatalog},
    parse::{load_abgleich_xlsx, parse_erp, parse_rfid, ErpImport},
    pdf::{render_abgleich_pdf, render_bestaetigung_pdf, PdfExportInput, PdfTotals},
    types::{
        ArtNrCompareRow, CompareInput, CompareResult, ErpRow, LotIdCompareRow, OffenePostenRow,
        ProductInfo, RfidRow,
    },
    DomainError, DomainResult,
};
