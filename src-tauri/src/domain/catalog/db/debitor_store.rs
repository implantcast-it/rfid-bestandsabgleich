//! Debitor insert / import / resolve / search for [`CatalogDb`].

use rusqlite::params;

use crate::domain::catalog::db::CatalogDb;
use crate::domain::catalog::types::{DebitorEntry, ImportSheetStats};
use crate::domain::error::{DomainError, DomainResult};
use crate::domain::normalize::cell_to_string;

fn escape_like(raw: &str) -> String {
    raw.replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

impl CatalogDb {
    /// Insert debitor only if missing. Returns true when a row was inserted.
    pub fn insert_debitor_additive(&self, entry: &DebitorEntry) -> DomainResult<bool> {
        let id = cell_to_string(&entry.debitorenkonto);
        let kundenname = cell_to_string(&entry.kundenname);
        if id.is_empty() || kundenname.is_empty() {
            return Ok(false);
        }
        let changed = self
            .conn
            .execute(
                "INSERT OR IGNORE INTO debitors(
                    debitorenkonto, kundenname, postanschrift, plz, ort, imported_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    id,
                    kundenname,
                    cell_to_string(&entry.postanschrift),
                    cell_to_string(&entry.plz),
                    cell_to_string(&entry.ort),
                    Self::now_iso()
                ],
            )
            .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
        Ok(changed > 0)
    }

    pub fn resolve_debitor(&self, debitorenkonto: &str) -> DomainResult<Option<String>> {
        use rusqlite::OptionalExtension;
        let id = cell_to_string(debitorenkonto);
        if id.is_empty() {
            return Ok(None);
        }
        self.conn
            .query_row(
                "SELECT kundenname FROM debitors WHERE debitorenkonto = ?1",
                params![id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| DomainError::CatalogDb(e.to_string()))
    }

    /// Case-insensitive substring search on id or name (for typeahead).
    pub fn search_debitors(&self, query: &str, limit: usize) -> DomainResult<Vec<DebitorEntry>> {
        let q = query.trim();
        let limit = limit.clamp(1, 100) as i64;
        let mut stmt = if q.is_empty() {
            self.conn
                .prepare(
                    "SELECT debitorenkonto, kundenname, postanschrift, plz, ort FROM debitors
                     ORDER BY kundenname COLLATE NOCASE
                     LIMIT ?1",
                )
                .map_err(|e| DomainError::CatalogDb(e.to_string()))?
        } else {
            self.conn
                .prepare(
                    "SELECT debitorenkonto, kundenname, postanschrift, plz, ort FROM debitors
                     WHERE debitorenkonto LIKE ?1 ESCAPE '\\'
                        OR kundenname LIKE ?1 ESCAPE '\\'
                        OR ort LIKE ?1 ESCAPE '\\'
                        OR plz LIKE ?1 ESCAPE '\\'
                     ORDER BY kundenname COLLATE NOCASE
                     LIMIT ?2",
                )
                .map_err(|e| DomainError::CatalogDb(e.to_string()))?
        };

        let pattern = if q.is_empty() {
            None
        } else {
            Some(format!("%{}%", escape_like(q)))
        };

        let map_row = |row: &rusqlite::Row<'_>| -> rusqlite::Result<DebitorEntry> {
            Ok(DebitorEntry {
                debitorenkonto: row.get(0)?,
                kundenname: row.get(1)?,
                postanschrift: row.get(2)?,
                plz: row.get(3)?,
                ort: row.get(4)?,
            })
        };

        let mut out = Vec::new();
        if let Some(pattern) = pattern {
            let rows = stmt
                .query_map(params![pattern, limit], map_row)
                .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
            for row in rows {
                out.push(row.map_err(|e| DomainError::CatalogDb(e.to_string()))?);
            }
        } else {
            let rows = stmt
                .query_map(params![limit], map_row)
                .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
            for row in rows {
                out.push(row.map_err(|e| DomainError::CatalogDb(e.to_string()))?);
            }
        }
        Ok(out)
    }

    pub fn import_debitor_rows(
        &self,
        rows: impl Iterator<Item = DebitorEntry>,
        stats: &mut ImportSheetStats,
    ) -> DomainResult<()> {
        let tx = self
            .conn
            .unchecked_transaction()
            .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
        {
            let mut stmt = tx
                .prepare(
                    "INSERT OR IGNORE INTO debitors(
                        debitorenkonto, kundenname, postanschrift, plz, ort, imported_at
                     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                )
                .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
            let imported_at = Self::now_iso();
            for entry in rows {
                stats.rows_read += 1;
                if entry.debitorenkonto.is_empty() || entry.kundenname.is_empty() {
                    continue;
                }
                let n = stmt
                    .execute(params![
                        entry.debitorenkonto,
                        entry.kundenname,
                        entry.postanschrift,
                        entry.plz,
                        entry.ort,
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
