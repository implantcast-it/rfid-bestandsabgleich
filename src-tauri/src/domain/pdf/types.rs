//! PDF export DTOs and totals.

use serde::{Deserialize, Serialize};

use crate::domain::types::{LotIdCompareRow, OffenePostenRow};

/// Input for [`crate::domain::pdf::render_abgleich_pdf`].
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdfExportInput {
    pub debitor: String,
    #[serde(default)]
    pub kundenname: String,
    pub lots: Vec<LotIdCompareRow>,
    /// Offene Posten: printed as a separate table and never counted in the totals.
    #[serde(default)]
    pub offene_posten: Vec<OffenePostenRow>,
    /// Optional ISO-8601 / RFC3339 timestamp; defaults to `Local::now()`.
    #[serde(default)]
    pub generated_at: Option<String>,
}

/// Aggregated SOLL / IST / Abweichung for tests and callers.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PdfTotals {
    pub anzahl: usize,
    pub soll: i64,
    pub ist: i64,
    pub abweichung: i64,
}

impl PdfTotals {
    pub fn from_lots(lots: &[LotIdCompareRow]) -> Self {
        let soll = sum_presence(lots.iter().map(|r| r.erp.as_str()));
        let ist = sum_presence(lots.iter().map(|r| r.rfid_scan.as_str()));
        Self {
            anzahl: lots.len(),
            soll,
            ist,
            abweichung: ist - soll,
        }
    }
}

/// Sum presence-flag cells (`"1"` / `"0"` / numeric strings) the same way jsPDF did.
pub fn sum_presence(values: impl Iterator<Item = impl AsRef<str>>) -> i64 {
    values.fold(0_i64, |acc, v| {
        let n = v.as_ref().trim().parse::<f64>().unwrap_or(0.0);
        if n.is_finite() {
            acc + n as i64
        } else {
            acc
        }
    })
}
