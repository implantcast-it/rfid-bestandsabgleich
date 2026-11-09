//! Shared string normalization for match keys (GTIN, LotId).
//!
//! ## Why this exists
//!
//! v4 had several silent mismatches:
//! - Master GTINs as Excel numbers vs RFID string GTINs (`===` miss)
//! - ERP LotIds trimmed but RFID LotIds not
//! - LotId cleanup regex without the global flag (only first illegal run stripped)
//! - Comment claimed `/` was allowed, but the regex removed it
//!
//! This module makes those rules explicit and symmetric.

use regex::Regex;
use std::cmp::Ordering;
use std::sync::OnceLock;

/// Characters allowed in a LotId after cleanup: letters, digits, `/`, `-`.
/// Illegal runs are removed **globally** (not just the first match).
fn lot_id_cleanup_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"[^A-Za-z0-9/-]+").expect("LotId cleanup regex"))
}

/// Normalize a GTIN to a trimmed string.
///
/// Leading zeros are preserved when the value is already a string.
/// Float-like Excel serials (`4.048844e13`) are avoided by callers preferring
/// the formatted display value when available; this helper still stringifies
/// whatever it receives and strips a trailing `.0` from whole numbers.
pub fn normalize_gtin(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    // Whole-number floats from Excel (e.g. "4048844149895.0") → drop ".0"
    if let Some(without_dot_zero) = trimmed.strip_suffix(".0") {
        if without_dot_zero.chars().all(|c| c.is_ascii_digit()) {
            return without_dot_zero.to_string();
        }
    }

    trimmed.to_string()
}

/// Trim and strip illegal LotId characters (keep `A-Z a-z 0-9 / -`).
pub fn normalize_lot_id(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    lot_id_cleanup_re().replace_all(trimmed, "").into_owned()
}

/// Cell → string for spreadsheet values (trim; empty if blank).
pub fn cell_to_string(raw: &str) -> String {
    raw.trim().to_string()
}

/// Numeric cell → count text: `"3"` and `"3.0"` both give `"3"`; `"2.5"` stays `"2.5"`.
///
/// Returns `None` for blank, non-numeric, or non-finite input.
pub fn normalize_count(raw: &str) -> Option<String> {
    let value = raw.trim().parse::<f64>().ok().filter(|n| n.is_finite())?;
    if value.fract() == 0.0 {
        return Some(format!("{}", value as i64));
    }
    Some(value.to_string())
}

/// Numeric-aware Artikelnummer order (`"3"` before `"20"`); otherwise plain text order.
pub fn cmp_artikelnummer(a: &str, b: &str) -> Ordering {
    match (a.parse::<f64>(), b.parse::<f64>()) {
        (Ok(x), Ok(y)) => x.partial_cmp(&y).unwrap_or(Ordering::Equal),
        _ => a.cmp(b),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn gtin_preserves_leading_zeros() {
        assert_eq!(normalize_gtin("04048844149895"), "04048844149895");
    }

    #[test]
    fn gtin_trims_whitespace() {
        assert_eq!(normalize_gtin("  123  "), "123");
    }

    #[test]
    fn gtin_strips_trailing_dot_zero() {
        assert_eq!(normalize_gtin("4048844149895.0"), "4048844149895");
    }

    #[test]
    fn lot_id_keeps_slash_and_dash() {
        assert_eq!(normalize_lot_id("LOT/1-2026"), "LOT/1-2026");
    }

    #[test]
    fn lot_id_strips_illegal_chars_globally() {
        // v4 (no `g` flag) would leave the space: "LOT1 2026"
        assert_eq!(normalize_lot_id("LOT/1 2026"), "LOT/12026");
        assert_eq!(normalize_lot_id("A B C"), "ABC");
    }

    #[test]
    fn lot_id_trims_both_sides() {
        assert_eq!(normalize_lot_id("  ABC123  "), "ABC123");
    }

    #[test]
    fn count_drops_whole_number_decimals() {
        assert_eq!(normalize_count("3"), Some("3".to_string()));
        assert_eq!(normalize_count(" 3.0 "), Some("3".to_string()));
        assert_eq!(normalize_count("2.5"), Some("2.5".to_string()));
    }

    #[test]
    fn count_rejects_blank_and_text() {
        assert_eq!(normalize_count(""), None);
        assert_eq!(normalize_count("offen"), None);
    }

    #[test]
    fn artikelnummer_sorts_numerically_then_as_text() {
        assert_eq!(cmp_artikelnummer("3", "20"), Ordering::Less);
        assert_eq!(cmp_artikelnummer("A2", "A10"), Ordering::Greater);
        assert_eq!(cmp_artikelnummer("3", "A"), Ordering::Less);
    }
}
