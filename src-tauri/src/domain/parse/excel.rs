//! Shared calamine helpers for reading Excel sheets as header → row maps.

use std::collections::HashMap;
use std::path::Path;

use calamine::{open_workbook_auto, Data, ExcelDateTime, Range, Reader};

use crate::domain::error::{DomainError, DomainResult};
use crate::domain::normalize::{cell_to_string, normalize_gtin};

/// Open any supported workbook format (xlsx, xls, …).
pub fn open_workbook(
    path: &Path,
) -> DomainResult<calamine::Sheets<std::io::BufReader<std::fs::File>>> {
    open_workbook_auto(path).map_err(|e| DomainError::ExcelOpen {
        path: path.to_path_buf(),
        message: e.to_string(),
    })
}

/// Convert a calamine cell to a display string suitable for match keys.
///
/// Prefer string / integer representations so GTINs keep leading zeros when
/// stored as text. Floats that are whole numbers drop the trailing `.0`.
pub fn cell_as_string(cell: &Data) -> String {
    match cell {
        Data::Empty => String::new(),
        Data::String(s) => cell_to_string(s),
        Data::Int(i) => i.to_string(),
        Data::Float(f) => {
            if f.fract() == 0.0 && *f >= 0.0 && *f < 1e15 {
                format!("{:.0}", f)
            } else {
                f.to_string()
            }
        }
        Data::Bool(b) => b.to_string(),
        Data::DateTime(dt) => excel_datetime_to_string(dt),
        Data::DateTimeIso(s) | Data::DurationIso(s) => cell_to_string(s),
        Data::Error(err) => format!("#ERR:{err:?}"),
    }
}

/// Excel date cell → `dd.mm.yyyy`, plus `HH:MM` only when a time is set.
///
/// calamine's `Display` prints the raw serial number (e.g. `46022`), which the editor cannot read as a date.
fn excel_datetime_to_string(dt: &ExcelDateTime) -> String {
    if dt.is_duration() {
        return dt.to_string();
    }
    let (year, month, day, hour, minute, _second, _millisecond) = dt.to_ymd_hms_milli();
    if hour == 0 && minute == 0 {
        return format!("{day:02}.{month:02}.{year:04}");
    }
    format!("{day:02}.{month:02}.{year:04} {hour:02}:{minute:02}")
}

/// Read sheet `sheet_index` (0-based) into header-keyed string rows.
pub fn read_sheet_rows(
    path: &Path,
    sheet_index: usize,
) -> DomainResult<Vec<HashMap<String, String>>> {
    let mut workbook = open_workbook(path)?;
    let names = workbook.sheet_names().to_owned();
    let sheet_name = names.get(sheet_index).ok_or_else(|| DomainError::SheetMissing {
        sheet: format!("index {sheet_index}"),
    })?;
    let range = workbook
        .worksheet_range(sheet_name)
        .map_err(|e| DomainError::ExcelOpen {
            path: path.to_path_buf(),
            message: e.to_string(),
        })?;
    range_to_rows(&range, sheet_name)
}

/// Read a named sheet from an already-opened workbook into header-keyed rows.
pub fn read_range_rows(
    workbook: &mut calamine::Sheets<std::io::BufReader<std::fs::File>>,
    path: &Path,
    sheet_name: &str,
) -> DomainResult<Vec<HashMap<String, String>>> {
    let range = workbook
        .worksheet_range(sheet_name)
        .map_err(|e| DomainError::ExcelOpen {
            path: path.to_path_buf(),
            message: e.to_string(),
        })?;
    range_to_rows(&range, sheet_name)
}

/// Convert a worksheet range into header → value maps (row 0 = header).
pub fn range_to_rows(
    range: &Range<Data>,
    sheet_name: &str,
) -> DomainResult<Vec<HashMap<String, String>>> {
    let mut rows_iter = range.rows();
    let header_cells = rows_iter.next().ok_or_else(|| DomainError::SheetMissing {
        sheet: sheet_name.to_string(),
    })?;

    let headers: Vec<String> = header_cells.iter().map(cell_as_string).collect();
    if headers.iter().all(|h| h.is_empty()) {
        return Err(DomainError::SheetMissing {
            sheet: sheet_name.to_string(),
        });
    }

    let mut out = Vec::new();
    for row in rows_iter {
        let mut map = HashMap::new();
        let mut any_value = false;
        for (idx, cell) in row.iter().enumerate() {
            let Some(header) = headers.get(idx) else {
                continue;
            };
            if header.is_empty() {
                continue;
            }
            let mut value = cell_as_string(cell);
            if header == "GTIN" {
                value = normalize_gtin(&value);
            }
            if !value.is_empty() {
                any_value = true;
            }
            map.insert(header.clone(), value);
        }
        if any_value {
            out.push(map);
        }
    }

    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;
    use rust_xlsxwriter::{ExcelDateTime as WriterDateTime, Format, Workbook};

    #[test]
    fn excel_date_cell_reads_as_german_date() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("erp.xlsx");
        let mut workbook = Workbook::new();
        let sheet = workbook.add_worksheet();
        sheet.write_string(0, 0, "Ablaufdatum").expect("header");
        let date = WriterDateTime::from_ymd(2026, 5, 1).expect("date");
        let date_format = Format::new().set_num_format("dd.mm.yyyy");
        sheet
            .write_datetime_with_format(1, 0, &date, &date_format)
            .expect("date cell");
        workbook.save(&path).expect("save");

        let rows = read_sheet_rows(&path, 0).expect("read");
        assert_eq!(rows[0]["Ablaufdatum"], "01.05.2026");
    }
}
