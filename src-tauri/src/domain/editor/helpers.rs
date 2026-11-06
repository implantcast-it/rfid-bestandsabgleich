//! Shared helpers for editor mutations.

/// Parse a LotId presence / count cell (`"1"`, `"0"`, `"1.0"`, …) as `u8` 0/1-ish int.
pub fn presence_as_i64(raw: &str) -> i64 {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return 0;
    }
    if let Ok(v) = trimmed.parse::<i64>() {
        return v;
    }
    trimmed.parse::<f64>().map(|f| f as i64).unwrap_or(0)
}

/// Parse an Ax-Bestand ERP quantity cell; invalid/empty/negative → 0.
pub fn erp_quantity_as_u32(raw: &str) -> u32 {
    let trimmed = raw.trim().replace(',', ".");
    if trimmed.is_empty() {
        return 0;
    }
    if let Ok(v) = trimmed.parse::<i64>() {
        return v.max(0) as u32;
    }
    trimmed
        .parse::<f64>()
        .map(|f| f.floor().max(0.0) as u32)
        .unwrap_or(0)
}

/// Mandatory Stichproben quota: ceil(1% of ERP quantity total).
/// Integer form: `(total + 99) / 100`. Total 0 → required 0.
pub fn stichproben_required_from_erp_total(total: u32) -> u32 {
    if total == 0 {
        return 0;
    }
    total.saturating_add(99) / 100
}

/// True when To Do is null-equivalent / blank after trim.
pub fn is_todo_empty(to_do: &str) -> bool {
    to_do.trim().is_empty()
}

/// True when presence flag is effectively 1.
pub fn is_present(raw: &str) -> bool {
    presence_as_i64(raw) == 1
}

/// True when presence flag is effectively 0.
pub fn is_absent(raw: &str) -> bool {
    presence_as_i64(raw) == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stichproben_required_ceil_one_percent() {
        assert_eq!(stichproben_required_from_erp_total(0), 0);
        assert_eq!(stichproben_required_from_erp_total(1), 1);
        assert_eq!(stichproben_required_from_erp_total(100), 1);
        assert_eq!(stichproben_required_from_erp_total(101), 2);
        assert_eq!(stichproben_required_from_erp_total(250), 3);
    }

    #[test]
    fn erp_quantity_parses_common_forms() {
        assert_eq!(erp_quantity_as_u32(""), 0);
        assert_eq!(erp_quantity_as_u32("12"), 12);
        assert_eq!(erp_quantity_as_u32("12.9"), 12);
        assert_eq!(erp_quantity_as_u32("12,5"), 12);
        assert_eq!(erp_quantity_as_u32("-3"), 0);
        assert_eq!(erp_quantity_as_u32("abc"), 0);
    }
}
