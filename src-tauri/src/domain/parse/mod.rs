//! File parsers for Master / ERP / Abgleich (Excel via calamine) and RFID TXT (`csv`).

mod abgleich;
mod abgleich_cells;
mod abgleich_map;
mod erp;
pub(crate) mod excel;
mod master;
mod rfid;

pub use abgleich::load_abgleich_xlsx;
pub use erp::{parse_erp, ErpImport};
pub use master::{kennzeichen_from_row, load_catalog_from_path};
pub use rfid::parse_rfid;
