//! Cell / sheet helpers for Abgleich workbook reload.

use std::collections::HashMap;
use std::path::Path;

use crate::domain::error::{DomainError, DomainResult};
use crate::domain::normalize::cell_to_string;
use crate::domain::parse::excel::read_range_rows;

/// Rows of an optional sheet. A sheet without any cells has no header row and reads as empty.
pub(crate) fn read_optional_rows(
    workbook: &mut calamine::Sheets<std::io::BufReader<std::fs::File>>,
    path: &Path,
    sheet: &str,
) -> DomainResult<Vec<HashMap<String, String>>> {
    match read_range_rows(workbook, path, sheet) {
        Err(DomainError::SheetMissing { .. }) => Ok(Vec::new()),
        other => other,
    }
}

pub(crate) fn require_sheet(names: &[String], sheet: &str) -> DomainResult<()> {
    if names.iter().any(|n| n == sheet) {
        Ok(())
    } else {
        Err(DomainError::InvalidAbgleich {
            message: format!("Erforderliche Sheets fehlen (u. a. „{sheet}“)."),
        })
    }
}

pub(crate) fn require_column(
    row: &HashMap<String, String>,
    column: &str,
    context: &str,
) -> DomainResult<()> {
    if row.contains_key(column) {
        Ok(())
    } else {
        Err(DomainError::InvalidAbgleich {
            message: format!("Erforderliche Spalte fehlt in {context}: {column}."),
        })
    }
}

pub(crate) fn get(row: &HashMap<String, String>, key: &str) -> String {
    row.get(key)
        .map(|s| cell_to_string(s))
        .unwrap_or_default()
}

pub(crate) fn parse_i64(raw: &str) -> i64 {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return 0;
    }
    if let Ok(v) = trimmed.parse::<i64>() {
        return v;
    }
    trimmed
        .parse::<f64>()
        .map(|f| f as i64)
        .unwrap_or(0)
}

pub(crate) fn parse_u32(raw: &str) -> u32 {
    let v = parse_i64(raw);
    if v < 0 {
        0
    } else {
        v as u32
    }
}

/// Coerce presence / flag cells to `"1"` or `"0"`.
pub(crate) fn presence_flag(raw: &str) -> String {
    let t = raw.trim();
    if t == "1" || t.eq_ignore_ascii_case("true") {
        return "1".into();
    }
    if let Ok(n) = t.parse::<f64>() {
        if (n - 1.0).abs() < f64::EPSILON {
            return "1".into();
        }
    }
    "0".into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn presence_flag_coerces_numeric_and_string() {
        assert_eq!(presence_flag("1"), "1");
        assert_eq!(presence_flag("1.0"), "1");
        assert_eq!(presence_flag("0"), "0");
        assert_eq!(presence_flag(""), "0");
    }

    #[test]
    fn parse_i64_from_float_string() {
        assert_eq!(parse_i64("3"), 3);
        assert_eq!(parse_i64("3.0"), 3);
        assert_eq!(parse_i64("-1"), -1);
    }
}
