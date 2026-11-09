//! LotId comparison — binary presence (`"1"` / `"0"`) over the union of lots.
//!
//! Sort order: Kennzeichen 3 groups `IMP` → `INST` → `SIEB` → other,
//! then numeric-aware Artikelnummer. `Index` is reassigned 1..n after sort.
//!
//! Both ERP and RFID LotIds are expected to already be normalized (trim + cleanup).

use std::collections::{HashMap, HashSet};

use uuid::Uuid;

use crate::domain::normalize::cmp_artikelnummer;
use crate::domain::types::{ErpRow, LotIdCompareRow, RfidRow, UNBEKANNT};

const KZ_ORDER: &[&str] = &["IMP", "INST", "SIEB"];

/// Build LotId reconciliation rows from ERP + RFID.
pub fn compare_lot_id(erp: &[ErpRow], rfid: &[RfidRow]) -> Vec<LotIdCompareRow> {
    let mut map_erp: HashMap<String, &ErpRow> = HashMap::new();
    for item in erp {
        if item.lot_id.is_empty() {
            continue;
        }
        // First ERP row with this LotId wins (mirrors Map.set overwrite → last wins
        // in JS; we keep first for stability — ERP duplicates are rare).
        map_erp.entry(item.lot_id.clone()).or_insert(item);
    }

    let mut map_rfid: HashMap<String, &RfidRow> = HashMap::new();
    for item in rfid {
        if item.lot_id.is_empty() {
            continue;
        }
        map_rfid.entry(item.lot_id.clone()).or_insert(item);
    }

    let all_lots: HashSet<&String> = map_erp.keys().chain(map_rfid.keys()).collect();
    let mut rows = Vec::with_capacity(all_lots.len());

    for lot_id in all_lots {
        let item_erp = map_erp.get(lot_id);
        let item_rfid = map_rfid.get(lot_id);

        let (artikelnummer, produktname, kennzeichen_3) = if let Some(e) = item_erp {
            (
                e.artikelnummer.clone(),
                e.produktname.clone(),
                e.kennzeichen_3.clone(),
            )
        } else if let Some(r) = item_rfid {
            (
                r.artikelnummer.clone(),
                r.produktname.clone(),
                r.kennzeichen_3.clone(),
            )
        } else {
            (
                UNBEKANNT.to_string(),
                UNBEKANNT.to_string(),
                UNBEKANNT.to_string(),
            )
        };

        rows.push(LotIdCompareRow {
            artikelnummer,
            produktname,
            kennzeichen_3,
            lot_id: lot_id.clone(),
            erp: if item_erp.is_some() { "1" } else { "0" }.into(),
            rfid_scan: if item_rfid.is_some() { "1" } else { "0" }.into(),
            ablaufdatum: item_erp
                .map(|e| e.ablaufdatum.clone())
                .unwrap_or_else(|| "-".into()),
            to_do: String::new(),
            anmerkung: String::new(),
            stichprobe: String::new(),
            id: Uuid::new_v4().to_string(),
            index: 0,
        });
    }

    rows.sort_by(lot_sort_key);
    for (idx, row) in rows.iter_mut().enumerate() {
        row.index = (idx + 1) as u32;
    }
    rows
}

fn kz_group(kz: &str) -> usize {
    KZ_ORDER
        .iter()
        .position(|k| *k == kz)
        .unwrap_or(KZ_ORDER.len())
}

fn lot_sort_key(a: &LotIdCompareRow, b: &LotIdCompareRow) -> std::cmp::Ordering {
    let ga = kz_group(&a.kennzeichen_3);
    let gb = kz_group(&b.kennzeichen_3);
    if ga != gb {
        return ga.cmp(&gb);
    }

    cmp_artikelnummer(&a.artikelnummer, &b.artikelnummer)
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    fn erp(art: &str, lot: &str, kz: &str) -> ErpRow {
        ErpRow {
            artikelnummer: art.into(),
            produktname: format!("P-{art}"),
            lot_id: lot.into(),
            kennzeichen_3: kz.into(),
            ablaufdatum: "1/1/2030".into(),
            debitorenkonto: "1".into(),
            erp: "1".into(),
            extra: vec![],
        }
    }

    fn rfid(art: &str, lot: &str, kz: &str) -> RfidRow {
        RfidRow {
            gtin: "1".into(),
            lot_id: lot.into(),
            kennung_1: "QM".into(),
            debitorennummer: "1".into(),
            erfasst_um: "12:00".into(),
            artikelnummer: art.into(),
            produktname: format!("P-{art}"),
            kennzeichen_3: kz.into(),
        }
    }

    #[test]
    fn presence_flags_for_match_missing_extra() {
        let rows = compare_lot_id(
            &[erp("100", "L1", "IMP"), erp("100", "L2", "IMP")],
            &[rfid("100", "L1", "IMP"), rfid("100", "L3", "IMP")],
        );
        let by_lot: HashMap<_, _> = rows.iter().map(|r| (r.lot_id.as_str(), r)).collect();
        assert_eq!(by_lot["L1"].erp, "1");
        assert_eq!(by_lot["L1"].rfid_scan, "1");
        assert_eq!(by_lot["L2"].erp, "1");
        assert_eq!(by_lot["L2"].rfid_scan, "0");
        assert_eq!(by_lot["L3"].erp, "0");
        assert_eq!(by_lot["L3"].rfid_scan, "1");
    }

    #[test]
    fn empty_erp_lot_id_omitted_from_map() {
        let rows = compare_lot_id(&[erp("100", "", "IMP")], &[rfid("100", "L1", "IMP")]);
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].lot_id, "L1");
    }

    #[test]
    fn sorts_imp_inst_sieb_then_other() {
        let rows = compare_lot_id(
            &[
                erp("3", "L_SIEB", "SIEB"),
                erp("2", "L_INST", "INST"),
                erp("1", "L_IMP", "IMP"),
                erp("4", "L_OTHER", "FOO"),
            ],
            &[],
        );
        let lots: Vec<_> = rows.iter().map(|r| r.lot_id.as_str()).collect();
        assert_eq!(lots, vec!["L_IMP", "L_INST", "L_SIEB", "L_OTHER"]);
        assert_eq!(rows[0].index, 1);
        assert_eq!(rows[3].index, 4);
    }

    #[test]
    fn numeric_artikelnummer_sort_within_group() {
        let rows = compare_lot_id(
            &[erp("20", "L20", "IMP"), erp("3", "L3", "IMP")],
            &[],
        );
        assert_eq!(rows[0].lot_id, "L3");
        assert_eq!(rows[1].lot_id, "L20");
    }
}
