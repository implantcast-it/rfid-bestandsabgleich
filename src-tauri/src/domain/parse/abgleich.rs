//! Load a previously exported Abgleich workbook into [`CompareResult`].
//!
//! ## Contract
//!
//! **Required sheets** (same as v4 `loadComparisonFile`):
//! - `Bestandsabgleich Artikelnummer`
//! - `Bestandsabgleich LotId`
//!
//! **Optional sheets** (empty if missing): `Ax-Bestand`, `RFID-Scan`, `Offene Posten`.
//!
//! Barcode / Master leftover sheets are ignored. Columns are bound **by header
//! name** so legacy exports (e.g. `Index` first on LotId) still load.
//!
//! Values are trusted as stored — this does **not** re-run compare.

use std::path::Path;

use calamine::Reader;

use crate::domain::error::{DomainError, DomainResult};
use crate::domain::parse::abgleich_cells::{read_optional_rows, require_sheet};
use crate::domain::parse::abgleich_map::{
    map_art_nr_row, map_erp_row, map_lot_id_row, map_offene_posten_row, map_rfid_row,
};
use crate::domain::parse::excel::{open_workbook, read_range_rows};
use crate::domain::types::{sheet_names, CompareResult, UNBEKANNT};

/// Load an Abgleich `.xlsx` from disk into a typed [`CompareResult`].
pub fn load_abgleich_xlsx(path: &Path) -> DomainResult<CompareResult> {
    if !path.exists() {
        return Err(DomainError::FileNotFound(path.to_path_buf()));
    }

    let mut workbook = open_workbook(path)?;
    let names = workbook.sheet_names().to_owned();

    require_sheet(&names, sheet_names::BESTANDSABGLEICH_ARTIKELNUMMER)?;
    require_sheet(&names, sheet_names::BESTANDSABGLEICH_LOT_ID)?;

    let art_rows = read_range_rows(
        &mut workbook,
        path,
        sheet_names::BESTANDSABGLEICH_ARTIKELNUMMER,
    )?;
    let lot_rows =
        read_range_rows(&mut workbook, path, sheet_names::BESTANDSABGLEICH_LOT_ID)?;

    let ax_bestand = if names.iter().any(|n| n == sheet_names::AX_BESTAND) {
        let rows = read_range_rows(&mut workbook, path, sheet_names::AX_BESTAND)?;
        rows.into_iter().map(map_erp_row).collect()
    } else {
        Vec::new()
    };

    let rfid_scan = if names.iter().any(|n| n == sheet_names::RFID_SCAN) {
        let rows = read_range_rows(&mut workbook, path, sheet_names::RFID_SCAN)?;
        rows.into_iter().map(map_rfid_row).collect()
    } else {
        Vec::new()
    };

    let offene_posten = if names.iter().any(|n| n == sheet_names::OFFENE_POSTEN) {
        read_optional_rows(&mut workbook, path, sheet_names::OFFENE_POSTEN)?
            .into_iter()
            .map(map_offene_posten_row)
            .collect()
    } else {
        Vec::new()
    };

    let bestandsabgleich_artikelnummer = art_rows
        .into_iter()
        .enumerate()
        .map(|(i, row)| map_art_nr_row(row, i))
        .collect::<DomainResult<Vec<_>>>()?;

    let mut bestandsabgleich_lot_id = lot_rows
        .into_iter()
        .enumerate()
        .map(|(i, row)| map_lot_id_row(row, i))
        .collect::<DomainResult<Vec<_>>>()?;

    // If Index was missing on every row, assign 1..n in file order.
    if bestandsabgleich_lot_id.iter().all(|r| r.index == 0) {
        for (idx, row) in bestandsabgleich_lot_id.iter_mut().enumerate() {
            row.index = (idx + 1) as u32;
        }
    }

    let debitor = ax_bestand
        .iter()
        .map(|r| r.debitorenkonto.trim())
        .find(|s| !s.is_empty())
        .unwrap_or(UNBEKANNT)
        .to_string();

    Ok(CompareResult {
        debitor,
        // Name resolution is catalog-based; reload leaves Unbekannt until UI resolves.
        kundenname: UNBEKANNT.to_string(),
        ax_bestand,
        rfid_scan,
        bestandsabgleich_artikelnummer,
        bestandsabgleich_lot_id,
        offene_posten,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::export::write_abgleich_xlsx;
    use crate::domain::types::OffenePostenRow;
    use pretty_assertions::assert_eq;
    use rust_xlsxwriter::Workbook;
    use tempfile::TempDir;

    fn open_position(lot: &str, offen: &str) -> OffenePostenRow {
        OffenePostenRow {
            artikelnummer: "4711".into(),
            produktname: "Schraube".into(),
            lot_id: lot.into(),
            ablaufdatum: "01.05.2027".into(),
            offen: offen.into(),
            id: format!("op-{lot}"),
        }
    }

    fn empty_compare(offene_posten: Vec<OffenePostenRow>) -> CompareResult {
        CompareResult {
            debitor: "10521".into(),
            kundenname: UNBEKANNT.into(),
            ax_bestand: vec![],
            rfid_scan: vec![],
            bestandsabgleich_artikelnummer: vec![],
            bestandsabgleich_lot_id: vec![],
            offene_posten,
        }
    }

    #[test]
    fn offene_posten_roundtrip_through_excel() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("abgleich.xlsx");
        write_abgleich_xlsx(&empty_compare(vec![open_position("L9", "2")]), &path).unwrap();

        let loaded = load_abgleich_xlsx(&path).unwrap();
        assert_eq!(loaded.offene_posten, vec![open_position("L9", "2")]);
    }

    #[test]
    fn empty_offene_posten_sheet_loads_as_empty() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("abgleich.xlsx");
        write_abgleich_xlsx(&empty_compare(vec![]), &path).unwrap();

        let loaded = load_abgleich_xlsx(&path).unwrap();
        assert!(loaded.offene_posten.is_empty());
    }

    #[test]
    fn offene_posten_sheet_without_cells_loads_as_empty() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("abgleich.xlsx");
        let mut workbook = Workbook::new();
        workbook
            .add_worksheet()
            .set_name(sheet_names::BESTANDSABGLEICH_ARTIKELNUMMER)
            .unwrap()
            .write_string(0, 0, "Artikelnummer")
            .unwrap();
        workbook
            .add_worksheet()
            .set_name(sheet_names::BESTANDSABGLEICH_LOT_ID)
            .unwrap()
            .write_string(0, 0, "LotId")
            .unwrap();
        workbook
            .add_worksheet()
            .set_name(sheet_names::OFFENE_POSTEN)
            .unwrap();
        workbook.save(&path).unwrap();

        let loaded = load_abgleich_xlsx(&path).unwrap();
        assert!(loaded.offene_posten.is_empty());
    }

    #[test]
    fn workbook_without_offene_posten_sheet_loads_as_empty() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("abgleich.xlsx");
        let mut workbook = Workbook::new();
        workbook
            .add_worksheet()
            .set_name(sheet_names::BESTANDSABGLEICH_ARTIKELNUMMER)
            .unwrap()
            .write_string(0, 0, "Artikelnummer")
            .unwrap();
        workbook
            .add_worksheet()
            .set_name(sheet_names::BESTANDSABGLEICH_LOT_ID)
            .unwrap()
            .write_string(0, 0, "LotId")
            .unwrap();
        workbook.save(&path).unwrap();

        let loaded = load_abgleich_xlsx(&path).unwrap();
        assert!(loaded.offene_posten.is_empty());
    }
}
