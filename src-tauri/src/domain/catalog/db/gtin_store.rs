//! GTIN product insert / import / load for [`CatalogDb`].

use std::collections::HashMap;

use rusqlite::params;

use crate::domain::catalog::db::CatalogDb;
use crate::domain::catalog::types::ImportSheetStats;
use crate::domain::error::{DomainError, DomainResult};
use crate::domain::gtin::GtinCatalog;
use crate::domain::normalize::normalize_gtin;
use crate::domain::types::ProductInfo;

impl CatalogDb {
    /// Insert GTIN only if missing. Returns true when a row was inserted.
    pub fn insert_gtin_additive(&self, gtin: &str, info: &ProductInfo) -> DomainResult<bool> {
        let key = normalize_gtin(gtin);
        if key.is_empty() {
            return Ok(false);
        }
        let changed = self
            .conn
            .execute(
                "INSERT OR IGNORE INTO gtin_products(gtin, artikelnummer, produktname, kennzeichen_3, imported_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    key,
                    info.artikelnummer,
                    info.produktname,
                    info.kennzeichen_3,
                    Self::now_iso()
                ],
            )
            .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
        Ok(changed > 0)
    }

    /// Load all GTINs into an in-memory map for compare enrichment.
    pub fn load_gtin_catalog(&self) -> DomainResult<GtinCatalog> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT gtin, artikelnummer, produktname, kennzeichen_3 FROM gtin_products",
            )
            .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    ProductInfo {
                        artikelnummer: row.get(1)?,
                        produktname: row.get(2)?,
                        kennzeichen_3: row.get(3)?,
                    },
                ))
            })
            .map_err(|e| DomainError::CatalogDb(e.to_string()))?;

        let mut map = HashMap::new();
        for row in rows {
            let (gtin, info) = row.map_err(|e| DomainError::CatalogDb(e.to_string()))?;
            map.insert(gtin, info);
        }
        Ok(GtinCatalog::from_map(map))
    }

    /// Bulk-insert GTIN rows; updates `stats` counters.
    pub fn import_gtin_rows(
        &self,
        rows: impl Iterator<Item = (String, ProductInfo)>,
        stats: &mut ImportSheetStats,
    ) -> DomainResult<()> {
        let tx = self
            .conn
            .unchecked_transaction()
            .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
        {
            let mut stmt = tx
                .prepare(
                    "INSERT OR IGNORE INTO gtin_products(gtin, artikelnummer, produktname, kennzeichen_3, imported_at)
                     VALUES (?1, ?2, ?3, ?4, ?5)",
                )
                .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
            let imported_at = Self::now_iso();
            for (gtin, info) in rows {
                stats.rows_read += 1;
                if gtin.is_empty() {
                    continue;
                }
                let n = stmt
                    .execute(params![
                        gtin,
                        info.artikelnummer,
                        info.produktname,
                        info.kennzeichen_3,
                        imported_at
                    ])
                    .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
                if n > 0 {
                    stats.inserted += 1;
                } else {
                    stats.skipped_existing += 1;
                }
            }
        }
        tx.commit()
            .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
        Ok(())
    }
}
