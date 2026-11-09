//! SQLite-backed GTIN + Debitor stores (additive inserts only).

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use rusqlite::{params, Connection, OptionalExtension};

use crate::domain::catalog::types::{
    CatalogStats, DebitorEntry, ImportSheetStats, CATALOG_DB_FILENAME,
};
use crate::domain::error::{DomainError, DomainResult};
use crate::domain::gtin::GtinCatalog;
use crate::domain::normalize::{normalize_gtin, cell_to_string};
use crate::domain::types::{ProductInfo, UNBEKANNT};

/// Open connection to `app_data_dir/catalogs.sqlite`, creating schema as needed.
pub struct CatalogDb {
    conn: Connection,
    path: PathBuf,
}

impl CatalogDb {
    /// Open (or create) the catalog database under `app_data_dir`.
    pub fn open(app_data_dir: &Path) -> DomainResult<Self> {
        std::fs::create_dir_all(app_data_dir).map_err(|source| DomainError::Io {
            path: app_data_dir.to_path_buf(),
            source,
        })?;
        let path = app_data_dir.join(CATALOG_DB_FILENAME);
        let conn = Connection::open(&path).map_err(|e| DomainError::CatalogDb(e.to_string()))?;
        let db = Self { conn, path };
        db.migrate()?;
        Ok(db)
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    fn migrate(&self) -> DomainResult<()> {
        self.conn
            .execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS gtin_products (
                  gtin TEXT PRIMARY KEY NOT NULL,
                  artikelnummer TEXT NOT NULL,
                  produktname TEXT NOT NULL,
                  kennzeichen_3 TEXT NOT NULL,
                  imported_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS debitors (
                  debitorenkonto TEXT PRIMARY KEY NOT NULL,
                  kundenname TEXT NOT NULL,
                  postanschrift TEXT NOT NULL DEFAULT '',
                  plz TEXT NOT NULL DEFAULT '',
                  ort TEXT NOT NULL DEFAULT '',
                  imported_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS meta (
                  key TEXT PRIMARY KEY NOT NULL,
                  value TEXT NOT NULL
                );
                "#,
            )
            .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
        // Additive columns for DBs created before address fields existed.
        self.ensure_column("debitors", "postanschrift", "TEXT NOT NULL DEFAULT ''")?;
        self.ensure_column("debitors", "plz", "TEXT NOT NULL DEFAULT ''")?;
        self.ensure_column("debitors", "ort", "TEXT NOT NULL DEFAULT ''")?;
        Ok(())
    }

    fn ensure_column(&self, table: &str, column: &str, decl: &str) -> DomainResult<()> {
        let mut stmt = self
            .conn
            .prepare(&format!("PRAGMA table_info({table})"))
            .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
        let names: Vec<String> = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .map_err(|e| DomainError::CatalogDb(e.to_string()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
        if names.iter().any(|n| n == column) {
            return Ok(());
        }
        self.conn
            .execute(
                &format!("ALTER TABLE {table} ADD COLUMN {column} {decl}"),
                [],
            )
            .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
        Ok(())
    }

    fn now_iso() -> String {
        chrono::Local::now().to_rfc3339()
    }

    pub fn set_meta(&self, key: &str, value: &str) -> DomainResult<()> {
        self.conn
            .execute(
                "INSERT INTO meta(key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![key, value],
            )
            .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
        Ok(())
    }

    pub fn get_meta(&self, key: &str) -> DomainResult<Option<String>> {
        self.conn
            .query_row(
                "SELECT value FROM meta WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| DomainError::CatalogDb(e.to_string()))
    }

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

    pub fn stats(&self) -> DomainResult<CatalogStats> {
        let gtin_count = self.count_rows("SELECT COUNT(*) FROM gtin_products")?;
        let debitor_count = self.count_rows("SELECT COUNT(*) FROM debitors")?;
        Ok(CatalogStats {
            gtin_count,
            debitor_count,
            last_import_filename: self.get_meta("last_import_filename")?,
            last_import_at: self.get_meta("last_import_at")?,
        })
    }

    /// `COUNT(*)` as `u64`. Read as `i64` because rusqlite has no `FromSql` for `u64`.
    fn count_rows(&self, sql: &str) -> DomainResult<u64> {
        let count: i64 = self
            .conn
            .query_row(sql, [], |row| row.get(0))
            .map_err(|e| DomainError::CatalogDb(e.to_string()))?;
        u64::try_from(count).map_err(|e| DomainError::CatalogDb(e.to_string()))
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

fn escape_like(raw: &str) -> String {
    raw.replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

/// Resolve Kundenname or fall back to [`UNBEKANNT`].
pub fn kundenname_or_unknown(db: &CatalogDb, debitorenkonto: &str) -> DomainResult<String> {
    Ok(db
        .resolve_debitor(debitorenkonto)?
        .unwrap_or_else(|| UNBEKANNT.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;
    use tempfile::TempDir;

    #[test]
    fn additive_gtin_and_debitor_search() {
        let dir = TempDir::new().unwrap();
        let db = CatalogDb::open(dir.path()).unwrap();
        let info = ProductInfo {
            artikelnummer: "A1".into(),
            produktname: "P".into(),
            kennzeichen_3: "IMP".into(),
        };
        assert!(db.insert_gtin_additive("123", &info).unwrap());
        assert!(!db.insert_gtin_additive("123", &ProductInfo {
            artikelnummer: "OTHER".into(),
            produktname: "X".into(),
            kennzeichen_3: "SIEB".into(),
        }).unwrap());

        let entry = DebitorEntry {
            debitorenkonto: "10521".into(),
            kundenname: "Klinikum Test".into(),
            postanschrift: "Hauptstr. 1".into(),
            plz: "80331".into(),
            ort: "München".into(),
        };
        assert!(db.insert_debitor_additive(&entry).unwrap());
        assert!(!db
            .insert_debitor_additive(&DebitorEntry {
                kundenname: "Andere".into(),
                ..entry.clone()
            })
            .unwrap());
        assert_eq!(
            db.resolve_debitor("10521").unwrap().as_deref(),
            Some("Klinikum Test")
        );

        let hits = db.search_debitors("klin", 10).unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].debitorenkonto, "10521");
        assert_eq!(hits[0].plz, "80331");
        assert_eq!(hits[0].ort, "München");

        let cat = db.load_gtin_catalog().unwrap();
        assert_eq!(cat.get("123").unwrap().artikelnummer, "A1");
    }
}
