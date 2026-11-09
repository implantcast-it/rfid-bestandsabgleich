//! Build the Abgleich Excel workbook from a [`CompareResult`].
//!
//! Sheet names match v4 for Logistik parity (ERP / RFID / ArtNr / LotId).
//! Sheets are always registered (no silent drop). No barcode sheets.

use std::path::{Path, PathBuf};

use chrono::Datelike;
use rust_xlsxwriter::conditional_format::ConditionalFormatFormula;
use rust_xlsxwriter::{
    Color, ExcelDateTime, Format, Table, TableColumn, TableStyle, Workbook, XlsxError,
};

use crate::domain::error::{DomainError, DomainResult};
use crate::domain::types::{
    sheet_names, ArtNrCompareRow, CompareResult, ErpRow, LotIdCompareRow, OffenePostenRow, RfidRow,
};

/// Write a scratch Abgleich workbook to `path`.
pub fn write_abgleich_xlsx(result: &CompareResult, path: &Path) -> DomainResult<()> {
    let mut workbook = build_workbook(result).map_err(|e| export_err(path, e))?;
    workbook.save(path).map_err(|e| export_err(path, e))?;
    Ok(())
}

/// Build the same workbook as [`write_abgleich_xlsx`] and return raw `.xlsx` bytes.
pub fn write_abgleich_xlsx_bytes(result: &CompareResult) -> DomainResult<Vec<u8>> {
    let mut workbook = build_workbook(result).map_err(|e| export_err_memory(e))?;
    workbook.save_to_buffer().map_err(export_err_memory)
}

fn build_workbook(result: &CompareResult) -> Result<Workbook, XlsxError> {
    let mut workbook = Workbook::new();
    write_ax_bestand(&mut workbook, &result.ax_bestand)?;
    write_rfid_scan(&mut workbook, &result.rfid_scan)?;
    write_art_nr(&mut workbook, &result.bestandsabgleich_artikelnummer)?;
    write_lot_id(&mut workbook, &result.bestandsabgleich_lot_id)?;
    write_offene_posten(&mut workbook, &result.offene_posten)?;
    Ok(workbook)
}

fn export_err(path: &Path, err: XlsxError) -> DomainError {
    DomainError::Export {
        path: path.to_path_buf(),
        message: err.to_string(),
    }
}

fn export_err_memory(err: XlsxError) -> DomainError {
    DomainError::Export {
        path: PathBuf::from("<memory>"),
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
        sheet.write_string(r, 6, &row.erp)?;
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
        sheet.write_number(r, 2, row.erp as f64)?;
        sheet.write_number(r, 3, row.rfid_scan as f64)?;
        sheet.write_number(r, 4, row.differenz as f64)?;
        sheet.write_string(r, 5, &row.id)?;
    }
    Ok(())
}

fn write_lot_id(wb: &mut Workbook, rows: &[LotIdCompareRow]) -> Result<(), XlsxError> {
    let sheet = wb.add_worksheet();
    sheet.set_name(sheet_names::BESTANDSABGLEICH_LOT_ID)?;
    let ablaufdatum_format = Format::new().set_num_format("dd.mm.yyyy");
    let headers = [
        "Kennzeichen 3",
        "Artikelnummer",
        "Produktname",
        "LotId",
        "ERP",
        "RFID-Scan",
        "To Do",
        "Anmerkung",
        "Stichprobe",
        "Ablaufdatum",
        "id",
        "Index",
    ];
    let mut columns = Vec::with_capacity(headers.len());

    for (c, h) in headers.iter().enumerate() {
        sheet.write_string(0, c as u16, *h)?;
        columns.push(TableColumn::new().set_header(*h));
    }
    for (r, row) in rows.iter().enumerate() {
        let r = (r + 1) as u32;
        sheet.write_string(r, 0, &row.kennzeichen_3)?;
        sheet.write_string(r, 1, &row.artikelnummer)?;
        sheet.write_string(r, 2, &row.produktname)?;
        sheet.write_string(r, 3, &row.lot_id)?;
        sheet.write_string(r, 4, &row.erp)?;
        sheet.write_string(r, 5, &row.rfid_scan)?;
        sheet.write_string(r, 6, &row.to_do)?;
        sheet.write_string(r, 7, &row.anmerkung)?;
        sheet.write_string(r, 8, &row.stichprobe)?;
        if let Some(date) = parse_ablaufdatum(&row.ablaufdatum) {
            let date =
                ExcelDateTime::from_ymd(date.year() as u16, date.month() as u8, date.day() as u8)?;
            sheet.write_datetime_with_format(r, 9, &date, &ablaufdatum_format)?;
        } else {
            sheet.write_string(r, 9, &row.ablaufdatum)?;
        }
        sheet.write_string(r, 10, &row.id)?;
        sheet.write_number(r, 11, row.index as f64)?;
    }
    if !rows.is_empty() {
        let table = Table::new()
            .set_columns(&columns)
            .set_name("Bestandsabgleich_LotId")
            .set_style(TableStyle::Light15);
        sheet.add_table(0, 0, rows.len() as u32, columns.len() as u16 - 1, &table)?;
    }

    // Formula-based rules recalculate in Excel as TODAY() changes.
    let format_red = Format::new().set_background_color(Color::Theme(5, 3)); // Red
    let format_orange = Format::new().set_background_color(Color::Theme(9, 3)); // Orange

    let condition_expired = ConditionalFormatFormula::new()
        .set_rule("=AND(ISNUMBER($J2),$J2<TODAY())")
        .set_format(&format_red);
    let condition_expiring_soon = ConditionalFormatFormula::new()
        .set_rule("=AND(ISNUMBER($J2),$J2>=TODAY(),$J2<=TODAY()+30)")
        .set_format(&format_orange);

    if !rows.is_empty() {
        sheet.add_conditional_format(1, 9, rows.len() as u32, 9, &condition_expired)?;
        sheet.add_conditional_format(1, 9, rows.len() as u32, 9, &condition_expiring_soon)?;
    }

    sheet.autofit();
    Ok(())
}

fn parse_ablaufdatum(value: &str) -> Option<chrono::NaiveDate> {
    let value = value.trim();
    ["%d.%m.%Y", "%Y-%m-%d", "%m/%d/%Y", "%-m/%-d/%Y"]
        .iter()
        .find_map(|format| chrono::NaiveDate::parse_from_str(value, format).ok())
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
