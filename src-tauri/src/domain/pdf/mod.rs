//! Landscape LotId inventur PDF and blank Bestätigungsformular via embedded Typst.

mod render;

pub use render::{
    render_abgleich_pdf, render_bestaetigung_pdf, sum_presence, PdfExportInput, PdfTotals,
};
