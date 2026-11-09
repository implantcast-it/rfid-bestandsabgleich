//! Editor chrome stats derived from live LotId rows + Ax-Bestand.

use crate::domain::editor::helpers::{
    erp_quantity_as_u32, is_present, is_todo_empty, stichproben_required_from_erp_total,
};
use crate::domain::editor::types::EditorStats;
use crate::domain::editor::vocabulary::STICHPROBE_DONE;
use crate::domain::types::{ErpRow, LotIdCompareRow};

pub(crate) fn compute_stats(rows: &[LotIdCompareRow], ax_bestand: &[ErpRow]) -> EditorStats {
    let mut abweichungen = 0u32;
    let mut offene_todos = 0u32;
    let mut stichproben_done = 0u32;

    for row in rows {
        let erp = is_present(&row.eigenbestand_nach_erp);
        let rfid = is_present(&row.rfid_scan);
        if erp != rfid {
            abweichungen += 1;
        }
        if is_todo_empty(&row.to_do) {
            offene_todos += 1;
        }
        if row.stichprobe.trim().eq_ignore_ascii_case(STICHPROBE_DONE) {
            stichproben_done += 1;
        }
    }

    let erp_quantity_total: u32 = ax_bestand
        .iter()
        .map(|row| erp_quantity_as_u32(&row.eigenbestand_nach_erp))
        .fold(0u32, u32::saturating_add);
    let stichproben_required = stichproben_required_from_erp_total(erp_quantity_total);

    EditorStats {
        abweichungen,
        offene_todos,
        stichproben_done,
        stichproben_required,
        erp_quantity_total,
    }
}
