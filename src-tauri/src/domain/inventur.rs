//! Inventur orchestration: catalog gates → parse → compare → editor snapshot.
//!
//! Progress callbacks report the real pipeline stages so the UI can show where
//! a failure happened (ERP lesen → RFID zuordnen → LotId vergleichen → Ergebnis).

use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::domain::catalog::{
    kundenname_or_unknown, CatalogDb, CatalogReady, CatalogStats,
};
use crate::domain::compare::run_compare;
use crate::domain::editor::{EditorSnapshot, InventurDraft};
use crate::domain::error::{DomainError, DomainResult};
use crate::domain::parse::{load_abgleich_xlsx, parse_erp, parse_rfid};
use crate::domain::types::CompareInput;

/// Pipeline stages shown on the home process panel.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InventurStepId {
    Erp,
    Rfid,
    Compare,
    Result,
}

impl InventurStepId {
    pub const fn index(self) -> u8 {
        match self {
            Self::Erp => 0,
            Self::Rfid => 1,
            Self::Compare => 2,
            Self::Result => 3,
        }
    }

    pub const fn label(self) -> &'static str {
        match self {
            Self::Erp => "ERP lesen",
            Self::Rfid => "RFID zuordnen",
            Self::Compare => "LotId vergleichen",
            Self::Result => "Ergebnis bereit",
        }
    }
}

/// Whether a stage just started, finished, or failed.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InventurProgressKind {
    Started,
    Finished,
    Failed,
}

/// One progress tick from the inventur pipeline.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct InventurProgressEvent {
    pub step: InventurStepId,
    pub step_index: u8,
    pub kind: InventurProgressKind,
    pub label: String,
    pub message: String,
    pub percent: u8,
}

impl InventurProgressEvent {
    pub fn new(step: InventurStepId, kind: InventurProgressKind, message: impl Into<String>) -> Self {
        let step_index = step.index();
        let percent = match kind {
            InventurProgressKind::Started => step_index.saturating_mul(25),
            InventurProgressKind::Finished => step_index
                .saturating_add(1)
                .saturating_mul(25)
                .min(100),
            InventurProgressKind::Failed => step_index
                .saturating_mul(25)
                .saturating_add(12)
                .min(100),
        };
        Self {
            step,
            step_index,
            kind,
            label: step.label().to_string(),
            message: message.into(),
            percent,
        }
    }
}

/// No-op progress sink for callers that do not need UI updates.
pub fn ignore_progress(_: InventurProgressEvent) {}

/// Build readiness from live catalog stats.
pub fn catalog_ready_from_stats(stats: CatalogStats) -> CatalogReady {
    let gtin_ok = stats.gtin_count > 0;
    let debitor_ok = stats.debitor_count > 0;
    CatalogReady {
        gtin_ok,
        debitor_ok,
        ready: gtin_ok && debitor_ok,
        stats,
    }
}

/// Ensure both GTIN and Debitor catalogs are non-empty.
pub fn require_catalog_ready(db: &CatalogDb) -> DomainResult<CatalogReady> {
    let ready = catalog_ready_from_stats(db.stats()?);
    if ready.ready {
        return Ok(ready);
    }

    let message = match (ready.gtin_ok, ready.debitor_ok) {
        (false, false) => {
            "Referenzkatalog unvollständig: GTIN-Liste und Debitoren fehlen. Bitte unter Einstellungen das Master-/Referenz-Excel importieren.".to_string()
        }
        (false, true) => {
            "GTIN-Katalog ist leer. Bitte unter Einstellungen die GTIN-Liste importieren.".to_string()
        }
        (true, false) => {
            "Debitoren-Katalog ist leer. Bitte unter Einstellungen die Debitorenliste importieren.".to_string()
        }
        (true, true) => unreachable!(),
    };

    Err(DomainError::CatalogNotReady { message })
}

fn report(
    on_progress: &mut impl FnMut(InventurProgressEvent),
    step: InventurStepId,
    kind: InventurProgressKind,
    message: impl Into<String>,
) {
    on_progress(InventurProgressEvent::new(step, kind, message));
}

fn fail_step<T>(
    on_progress: &mut impl FnMut(InventurProgressEvent),
    step: InventurStepId,
    error: DomainError,
) -> DomainResult<T> {
    report(
        on_progress,
        step,
        InventurProgressKind::Failed,
        error.to_string(),
    );
    Err(error)
}

/// Run inventur compare and emit real pipeline progress.
pub fn run_inventur_with_progress(
    db: &CatalogDb,
    erp_path: &Path,
    rfid_path: &Path,
    mut on_progress: impl FnMut(InventurProgressEvent),
) -> DomainResult<EditorSnapshot> {
    require_catalog_ready(db)?;

    report(
        &mut on_progress,
        InventurStepId::Erp,
        InventurProgressKind::Started,
        "ERP-Datei wird gelesen…",
    );
    let erp = match parse_erp(erp_path) {
        Ok(value) => value,
        Err(error) => return fail_step(&mut on_progress, InventurStepId::Erp, error),
    };
    report(
        &mut on_progress,
        InventurStepId::Erp,
        InventurProgressKind::Finished,
        format!(
            "{} Bestandszeilen, {} Offene Posten",
            erp.rows.len(),
            erp.offene_posten.len()
        ),
    );

    report(
        &mut on_progress,
        InventurStepId::Rfid,
        InventurProgressKind::Started,
        "RFID-Scan wird gelesen und über den GTIN-Katalog zugeordnet…",
    );
    let gtin = match db.load_gtin_catalog() {
        Ok(value) => value,
        Err(error) => return fail_step(&mut on_progress, InventurStepId::Rfid, error),
    };
    let rfid = match parse_rfid(rfid_path, &gtin) {
        Ok(value) => value,
        Err(error) => return fail_step(&mut on_progress, InventurStepId::Rfid, error),
    };
    report(
        &mut on_progress,
        InventurStepId::Rfid,
        InventurProgressKind::Finished,
        format!("{} RFID-Zeilen nach LotId", rfid.len()),
    );

    report(
        &mut on_progress,
        InventurStepId::Compare,
        InventurProgressKind::Started,
        "LotId- und Artikelnummer-Vergleich läuft…",
    );
    let kundenname = match kundenname_or_unknown(db, &erp.debitor) {
        Ok(value) => value,
        Err(error) => return fail_step(&mut on_progress, InventurStepId::Compare, error),
    };
    let result = run_compare(CompareInput {
        erp: erp.rows,
        rfid,
        debitor: erp.debitor,
        kundenname,
        offene_posten: erp.offene_posten,
    });
    report(
        &mut on_progress,
        InventurStepId::Compare,
        InventurProgressKind::Finished,
        format!(
            "{} LotId-Zeilen, {} Artikel",
            result.bestandsabgleich_lot_id.len(),
            result.bestandsabgleich_artikelnummer.len()
        ),
    );

    report(
        &mut on_progress,
        InventurStepId::Result,
        InventurProgressKind::Started,
        "Editor-Snapshot wird erstellt…",
    );
    let snapshot = InventurDraft::from_compare(result).snapshot();
    report(
        &mut on_progress,
        InventurStepId::Result,
        InventurProgressKind::Finished,
        format!(
            "{} LotId-Zeilen bereit",
            snapshot.lot_id_rows.len()
        ),
    );

    Ok(snapshot)
}

/// Run inventur compare from ERP + RFID paths using the on-device GTIN catalog.
pub fn run_inventur(
    db: &CatalogDb,
    erp_path: &Path,
    rfid_path: &Path,
) -> DomainResult<EditorSnapshot> {
    run_inventur_with_progress(db, erp_path, rfid_path, ignore_progress)
}

/// Load a previously exported Abgleich and resolve Kundenname from the catalog.
pub fn load_abgleich(db: &CatalogDb, path: &Path) -> DomainResult<EditorSnapshot> {
    let mut result = load_abgleich_xlsx(path)?;
    result.kundenname = kundenname_or_unknown(db, &result.debitor)?;
    Ok(InventurDraft::from_compare(result).snapshot())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::catalog::CatalogStats;

    #[test]
    fn ready_requires_both_counts() {
        let ready = catalog_ready_from_stats(CatalogStats {
            gtin_count: 1,
            debitor_count: 0,
            last_import_filename: None,
            last_import_at: None,
        });
        assert!(!ready.ready);
        assert!(ready.gtin_ok);
        assert!(!ready.debitor_ok);
    }

    #[test]
    fn ready_when_both_present() {
        let ready = catalog_ready_from_stats(CatalogStats {
            gtin_count: 10,
            debitor_count: 3,
            last_import_filename: Some("ref.xlsx".into()),
            last_import_at: None,
        });
        assert!(ready.ready);
    }

    #[test]
    fn progress_percent_tracks_pipeline_stages() {
        let started = InventurProgressEvent::new(
            InventurStepId::Rfid,
            InventurProgressKind::Started,
            "start",
        );
        assert_eq!(started.step_index, 1);
        assert_eq!(started.percent, 25);
        assert_eq!(started.label, "RFID zuordnen");

        let finished = InventurProgressEvent::new(
            InventurStepId::Compare,
            InventurProgressKind::Finished,
            "done",
        );
        assert_eq!(finished.percent, 75);

        let failed = InventurProgressEvent::new(
            InventurStepId::Erp,
            InventurProgressKind::Failed,
            "boom",
        );
        assert_eq!(failed.percent, 12);
        assert_eq!(failed.kind, InventurProgressKind::Failed);
    }
}
