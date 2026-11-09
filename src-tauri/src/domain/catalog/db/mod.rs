//! SQLite-backed GTIN + Debitor stores (additive inserts only).

mod debitor_store;
mod gtin_store;

use std::path::{Path, PathBuf};

use rusqlite::Connection;

use crate::domain::catalog::types::{CatalogStats, CATALOG_DB_FILENAME};
use crate::domain::error::{DomainError, DomainResult};
use crate::domain::types::UNBEKANNT;

/// Open connection to `app_data_dir/catalogs.sqlite`, creating schema as needed.
pub struct CatalogDb {
    pub(crate) conn: Connection,
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

    pub(crate) fn now_iso() -> String {
        chrono::Local::now().to_rfc3339()
    }

    pub fn set_meta(&self, key: &str, value: &str) -> DomainResult<()> {
        use rusqlite::params;
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
        use rusqlite::{params, OptionalExtension};
        self.conn
            .query_row(
                "SELECT value FROM meta WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| DomainError::CatalogDb(e.to_string()))
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
    use crate::domain::catalog::types::DebitorEntry;
    use crate::domain::types::ProductInfo;
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
