//! In-memory GTIN → product catalog with O(1) lookup.
//!
//! Built once from Master sheet 0 (or any path). Existing keys are not overwritten
//! on additive updates (product decision: GTIN mappings are immutable).

use std::collections::HashMap;
use std::path::Path;

use crate::domain::error::{DomainError, DomainResult};
use crate::domain::normalize::normalize_gtin;
use crate::domain::parse;
use crate::domain::types::ProductInfo;

/// Fast GTIN lookup used during RFID enrichment.
#[derive(Debug, Clone, Default)]
pub struct GtinCatalog {
    map: HashMap<String, ProductInfo>,
}

impl GtinCatalog {
    pub fn new() -> Self {
        Self {
            map: HashMap::new(),
        }
    }

    pub fn from_map(map: HashMap<String, ProductInfo>) -> Self {
        Self { map }
    }

    pub fn len(&self) -> usize {
        self.map.len()
    }

    pub fn is_empty(&self) -> bool {
        self.map.is_empty()
    }

    /// Insert only if the GTIN is new — existing mappings never change.
    pub fn insert_additive(&mut self, gtin: String, info: ProductInfo) -> bool {
        if gtin.is_empty() {
            return false;
        }
        if self.map.contains_key(&gtin) {
            return false;
        }
        self.map.insert(gtin, info);
        true
    }

    pub fn get(&self, gtin: &str) -> Option<&ProductInfo> {
        let key = normalize_gtin(gtin);
        self.map.get(&key)
    }
}

/// Load Master Excel sheet 0 into a [`GtinCatalog`].
pub fn load_gtin_catalog(path: &Path) -> DomainResult<GtinCatalog> {
    if !path.exists() {
        return Err(DomainError::FileNotFound(path.to_path_buf()));
    }
    parse::load_catalog_from_path(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    fn sample_info(art: &str) -> ProductInfo {
        ProductInfo {
            artikelnummer: art.into(),
            produktname: "Test".into(),
            kennzeichen_3: "IMP".into(),
        }
    }

    #[test]
    fn lookup_is_o1_and_normalizes_key() {
        let mut cat = GtinCatalog::new();
        cat.insert_additive("04048844149895".into(), sample_info("A1"));
        assert_eq!(
            cat.get(" 04048844149895 ").map(|p| p.artikelnummer.as_str()),
            Some("A1")
        );
    }

    #[test]
    fn additive_does_not_overwrite() {
        let mut cat = GtinCatalog::new();
        assert!(cat.insert_additive("1".into(), sample_info("first")));
        assert!(!cat.insert_additive("1".into(), sample_info("second")));
        assert_eq!(cat.get("1").unwrap().artikelnummer, "first");
    }
}
