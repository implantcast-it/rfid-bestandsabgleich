//! Build the Abgleich Excel workbook from a [`CompareResult`].
//!
//! Sheet names match v4 for Logistik parity (ERP / RFID / ArtNr / LotId).
//! Sheets are always registered (no silent drop). No barcode sheets.

use std::path::Path;

use rust_xlsxwriter::{Workbook, XlsxError};

use crate::domain::error::{DomainError, DomainResult};
use crate::domain::types::{
    sheet_names, ArtNrCompareRow, CompareResult, ErpRow, LotIdCompareRow, OffenePostenRow,
    RfidRow,
};

/// Write a scratch Abgleich workbook to `path`.
pub fn write_abgleich_xlsx(result: &CompareResult, path: &Path) -> DomainResult<()> {
    let mut workbook = Workbook::new();

    write_ax_bestand(&mut workbook, &result.ax_bestand).map_err(|e| export_err(path, e))?;
    write_rfid_scan(&mut workbook, &result.rfid_scan).map_err(|e| export_err(path, e))?;
    write_art_nr(&mut workbook, &result.bestandsabgleich_artikelnummer)
        .map_err(|e| export_err(path, e))?;
    write_lot_id(&mut workbook, &result.bestandsabgleich_lot_id).map_err(|e| export_err(path, e))?;
    write_offene_posten(&mut workbook, &result.offene_posten).map_err(|e| export_err(path, e))?;

    workbook.save(path).map_err(|e| export_err(path, e))?;
    Ok(())
}

fn export_err(path: &Path, err: XlsxError) -> DomainError {
    DomainError::Export {
        path: path.to_path_buf(),
        message: err.to_string(),
    }
}

fn write_ax_bestand(wb: &mut Workbook, rows: &[ErpRow]) -> Result<(), XlsxError> {
    let sheet = wb.add_worksheet();
    sheet.set_name(sheet_names::AX_BESTAND)?;
    let headers = [
        "Artikelnummer",
        "Produktname",
        "LotId",
        "Kennzeichen 3",
        "Ablaufdatum",
        "Debitorenkonto",
        "Eigenbestand nach ERP",
    ];
    for (c, h) in headers.iter().enumerate() {
        sheet.write_string(0, c as u16, *h)?;
    }
    for (r, row) in rows.iter().enumerate() {
        let r = (r + 1) as u32;
        sheet.write_string(r, 0, &row.artikelnummer)?;
        sheet.write_string(r, 1, &row.produktname)?;
        sheet.write_string(r, 2, &row.lot_id)?;
        sheet.write_string(r, 3, &row.kennzeichen_3)?;
        sheet.write_string(r, 4, &row.ablaufdatum)?;
        sheet.write_string(r, 5, &row.debitorenkonto)?;
        sheet.write_string(r, 6, &row.eigenbestand_nach_erp)?;
    }
    Ok(())
}

fn write_rfid_scan(wb: &mut Workbook, rows: &[RfidRow]) -> Result<(), XlsxError> {
    let sheet = wb.add_worksheet();
    sheet.set_name(sheet_names::RFID_SCAN)?;
    let headers = [
        "GTIN",
        "LotId",
        "Kennung 1",
        "Debitorennummer",
        "Erfasst um",
        "Artikelnummer",
        "Produktname",
        "Kennzeichen 3",
    ];
    for (c, h) in headers.iter().enumerate() {
        sheet.write_string(0, c as u16, *h)?;
    }
    for (r, row) in rows.iter().enumerate() {
        let r = (r + 1) as u32;
        sheet.write_string(r, 0, &row.gtin)?;
        sheet.write_string(r, 1, &row.lot_id)?;
        sheet.write_string(r, 2, &row.kennung_1)?;
        sheet.write_string(r, 3, &row.debitorennummer)?;
        sheet.write_string(r, 4, &row.erfasst_um)?;
        sheet.write_string(r, 5, &row.artikelnummer)?;
        sheet.write_string(r, 6, &row.produktname)?;
        sheet.write_string(r, 7, &row.kennzeichen_3)?;
    }
    Ok(())
}

fn write_art_nr(wb: &mut Workbook, rows: &[ArtNrCompareRow]) -> Result<(), XlsxError> {
    let sheet = wb.add_worksheet();
    sheet.set_name(sheet_names::BESTANDSABGLEICH_ARTIKELNUMMER)?;
    let headers = [
        "Artikelnummer",
        "Produktname",
        "Eigenbestand nach ERP",
        "RFID-Scan",
        "Differenz",
        "id",
    ];
    for (c, h) in headers.iter().enumerate() {
        sheet.write_string(0, c as u16, *h)?;
    }
    for (r, row) in rows.iter().enumerate() {
        let r = (r + 1) as u32;
        sheet.write_string(r, 0, &row.artikelnummer)?;
        sheet.write_string(r, 1, &row.produktname)?;
        sheet.write_number(r, 2, row.eigenbestand_nach_erp as f64)?;
        sheet.write_number(r, 3, row.rfid_scan as f64)?;
        sheet.write_number(r, 4, row.differenz as f64)?;
        sheet.write_string(r, 5, &row.id)?;
    }
    Ok(())
}

fn write_lot_id(wb: &mut Workbook, rows: &[LotIdCompareRow]) -> Result<(), XlsxError> {
    let sheet = wb.add_worksheet();
    sheet.set_name(sheet_names::BESTANDSABGLEICH_LOT_ID)?;
    let headers = [
        "Artikelnummer",
        "Produktname",
        "Kennzeichen 3",
        "LotId",
        "Eigenbestand nach ERP",
        "RFID-Scan",
        "Ablaufdatum",
        "To Do",
        "Anmerkung",
        "Stichprobe",
        "id",
        "Index",
    ];
    for (c, h) in headers.iter().enumerate() {
        sheet.write_string(0, c as u16, *h)?;
    }
    for (r, row) in rows.iter().enumerate() {
        let r = (r + 1) as u32;
        sheet.write_string(r, 0, &row.artikelnummer)?;
        sheet.write_string(r, 1, &row.produktname)?;
        sheet.write_string(r, 2, &row.kennzeichen_3)?;
        sheet.write_string(r, 3, &row.lot_id)?;
        sheet.write_string(r, 4, &row.eigenbestand_nach_erp)?;
        sheet.write_string(r, 5, &row.rfid_scan)?;
        sheet.write_string(r, 6, &row.ablaufdatum)?;
        sheet.write_string(r, 7, &row.to_do)?;
        sheet.write_string(r, 8, &row.anmerkung)?;
        sheet.write_string(r, 9, &row.stichprobe)?;
        sheet.write_string(r, 10, &row.id)?;
        sheet.write_number(r, 11, row.index as f64)?;
    }
    Ok(())
}

/// Always writes the header row, so the sheet exists even when no positions are open.
fn write_offene_posten(wb: &mut Workbook, rows: &[OffenePostenRow]) -> Result<(), XlsxError> {
    let sheet = wb.add_worksheet();
    sheet.set_name(sheet_names::OFFENE_POSTEN)?;
    let headers = [
        "Artikelnummer",
        "Produktname",
        "LotId",
        "Ablaufdatum",
        "Offen",
        "id",
    ];
    for (c, h) in headers.iter().enumerate() {
        sheet.write_string(0, c as u16, *h)?;
    }
    for (r, row) in rows.iter().enumerate() {
        let r = (r + 1) as u32;
        sheet.write_string(r, 0, &row.artikelnummer)?;
        sheet.write_string(r, 1, &row.produktname)?;
        sheet.write_string(r, 2, &row.lot_id)?;
        sheet.write_string(r, 3, &row.ablaufdatum)?;
        sheet.write_string(r, 4, &row.offen)?;
        sheet.write_string(r, 5, &row.id)?;
    }
    Ok(())
}
