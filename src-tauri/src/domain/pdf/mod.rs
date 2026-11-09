//! Landscape LotId inventur PDF and blank Bestätigungsformular via embedded Typst.

mod dict;
mod engine;
mod render;
mod types;

pub use render::{render_abgleich_pdf, render_bestaetigung_pdf};
pub use types::{sum_presence, PdfExportInput, PdfTotals};
