//! Inventur orchestration: catalog gates → parse → compare → editor snapshot.

use std::path::Path;

use crate::domain::catalog::{
    kundenname_or_unknown, CatalogDb, CatalogReady, CatalogStats,
};
use crate::domain::compare::run_compare;
use crate::domain::editor::{EditorSnapshot, InventurDraft};
use crate::domain::error::{DomainError, DomainResult};
use crate::domain::parse::{load_abgleich_xlsx, parse_erp, parse_rfid};
use crate::domain::types::CompareInput;

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

/// Run inventur compare from ERP + RFID paths using the on-device GTIN catalog.
pub fn run_inventur(
    db: &CatalogDb,
    erp_path: &Path,
    rfid_path: &Path,
) -> DomainResult<EditorSnapshot> {
    require_catalog_ready(db)?;

    let gtin = db.load_gtin_catalog()?;
    let erp = parse_erp(erp_path)?;
    let rfid = parse_rfid(rfid_path, &gtin)?;
    let kundenname = kundenname_or_unknown(db, &erp.debitor)?;

    let result = run_compare(CompareInput {
        erp: erp.rows,
        rfid,
        debitor: erp.debitor,
        kundenname,
        offene_posten: erp.offene_posten,
    });

    Ok(InventurDraft::from_compare(result).snapshot())
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
}
