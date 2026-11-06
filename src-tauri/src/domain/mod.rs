//! Pure domain layer for inventur import, reconciliation, and Excel export.
//!
//! ## Pipeline
//!
//! 1. **Import reference catalog** (one Excel: sheets `GTIN` + `Debitoren`) → local SQLite
//! 2. **Parse** ERP (calamine) and RFID TXT (`csv`); enrich via GTIN catalog
//! 3. **Resolve** Debitorenkonto → Kundenname
//! 4. **Compare** ArtNr (row counts) and LotId (binary presence)
//! 5. **Editor draft** LotId patches / bulk / auto-rules; ArtNr always derived
//! 6. **Export** scratch workbook via `rust_xlsxwriter` (`draft.to_export_result()`)
//!
//! Barcode scan input is out of scope. Confidential catalog data stays on-device only.

pub mod catalog;
pub mod compare;
pub mod editor;
pub mod error;
pub mod export;
pub mod gtin;
pub mod inventur;
pub mod normalize;
pub mod parse;
pub mod pdf;
pub mod projects;
pub mod types;

pub use error::{DomainError, DomainResult};
