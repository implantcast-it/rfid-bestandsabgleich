//! Domain error types with German operator-facing messages where useful.

use std::path::PathBuf;

use thiserror::Error;

/// Result alias for domain operations.
pub type DomainResult<T> = Result<T, DomainError>;

/// Failures at parse / compare / export boundaries.
#[derive(Debug, Error)]
pub enum DomainError {
    #[error("Datei nicht gefunden: {0}")]
    FileNotFound(PathBuf),

    #[error("Datei konnte nicht gelesen werden ({path}): {source}")]
    Io {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Excel-Datei konnte nicht geöffnet werden ({path}): {message}")]
    ExcelOpen { path: PathBuf, message: String },

    #[error("Excel-Tabelle fehlt oder ist leer: {sheet}")]
    SheetMissing { sheet: String },

    #[error("Erforderliche Spalte fehlt in {context}: {column}")]
    MissingColumn { context: String, column: String },

    #[error("TXT/CSV konnte nicht gelesen werden ({path}): {message}")]
    CsvParse { path: PathBuf, message: String },

    #[error("Vergleich fehlgeschlagen: {0}")]
    Compare(String),

    #[error("Excel-Export fehlgeschlagen ({path}): {message}")]
    Export { path: PathBuf, message: String },

    /// Invalid comparison workbook (missing required sheets/columns).
    #[error("Ungültige Vergleichsdatei. {message}")]
    InvalidAbgleich { message: String },

    #[error("Katalog-Datenbankfehler: {0}")]
    CatalogDb(String),

    #[error("Referenzkatalog ungültig: {0}")]
    CatalogImport(String),

    /// GTIN and/or Debitor catalog empty — inventur cannot start.
    #[error("{message}")]
    CatalogNotReady { message: String },

    /// Invalid LotId editor patch / bulk value (vocabulary or unknown row id).
    #[error("Ungültige Bearbeitung: {message}")]
    InvalidEdit { message: String },

    #[error("PDF-Erstellung fehlgeschlagen: {0}")]
    Pdf(String),

    #[error("Inventur-Projekt: {0}")]
    Project(String),
}
