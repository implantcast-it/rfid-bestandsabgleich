//! Excel export — always builds a **new** workbook (never clones Master).

mod xlsx;

pub use xlsx::{write_abgleich_xlsx, write_abgleich_xlsx_bytes};
