//! Validation and normalization for LotId patch fields.

use crate::domain::editor::types::LotIdPatch;
use crate::domain::editor::vocabulary::{
    ANMERKUNG_OPTIONS, STICHPROBE_DONE, TODO_OPTIONS,
};
use crate::domain::error::{DomainError, DomainResult};

#[derive(Default)]
pub(crate) struct NormalizedPatch {
    pub rfid_scan: Option<String>,
    pub to_do: Option<String>,
    pub anmerkung: Option<String>,
    pub stichprobe: Option<String>,
}

pub(crate) fn invalid_edit(message: impl Into<String>) -> DomainError {
    DomainError::InvalidEdit {
        message: message.into(),
    }
}

pub(crate) fn normalize_patch(patch: &LotIdPatch) -> DomainResult<NormalizedPatch> {
    let mut out = NormalizedPatch::default();
    if let Some(ref raw) = patch.rfid_scan {
        out.rfid_scan = Some(normalize_rfid_scan(raw)?);
    }
    if let Some(ref raw) = patch.to_do {
        out.to_do = Some(normalize_todo(raw)?);
    }
    if let Some(ref raw) = patch.anmerkung {
        out.anmerkung = Some(normalize_anmerkung(raw)?);
    }
    if let Some(ref raw) = patch.stichprobe {
        out.stichprobe = Some(normalize_stichprobe(raw)?);
    }
    Ok(out)
}

fn normalize_rfid_scan(raw: &str) -> DomainResult<String> {
    let trimmed = raw.trim();
    match trimmed {
        "0" | "1" => Ok(trimmed.to_string()),
        // Accept numeric cell editors that stringify without quotes issues
        _ => {
            // Also accept "0.0" / "1.0" from loose JS Number→string
            if let Ok(n) = trimmed.parse::<f64>() {
                if n == 0.0 {
                    return Ok("0".into());
                }
                if n == 1.0 {
                    return Ok("1".into());
                }
            }
            Err(invalid_edit(format!(
                "RFID-Scan muss 0 oder 1 sein (erhalten: '{raw}')."
            )))
        }
    }
}

fn normalize_todo(raw: &str) -> DomainResult<String> {
    let trimmed = raw.trim();
    // Vocab uses exact strings; empty is allowed.
    if TODO_OPTIONS.contains(&trimmed) {
        return Ok(trimmed.to_string());
    }
    Err(invalid_edit(format!(
        "Ungültiger To-Do-Wert: '{raw}'."
    )))
}

fn normalize_anmerkung(raw: &str) -> DomainResult<String> {
    let trimmed = raw.trim();
    if ANMERKUNG_OPTIONS.contains(&trimmed) {
        return Ok(trimmed.to_string());
    }
    Err(invalid_edit(format!(
        "Ungültiger Anmerkungs-Wert: '{raw}'."
    )))
}

fn normalize_stichprobe(raw: &str) -> DomainResult<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(String::new());
    }
    if trimmed.eq_ignore_ascii_case(STICHPROBE_DONE) {
        return Ok(STICHPROBE_DONE.to_string());
    }
    Err(invalid_edit(format!(
        "Stichprobe muss leer oder 'X' sein (erhalten: '{raw}')."
    )))
}
