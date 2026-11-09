use super::fixtures::{lot, open_position, sample_compare};
use super::*;
use crate::domain::editor::types::{EditorSnapshot, LotIdEditField, LotIdPatch};
use crate::domain::types::{ArtNrCompareRow, ErpRow};
use pretty_assertions::assert_eq;

#[test]
fn from_compare_ignores_stale_art_nr() {
    let lots = vec![
        lot("100", "L1", "1", "1", "a", 1),
        lot("100", "L2", "1", "0", "b", 2),
    ];
    let stale = vec![ArtNrCompareRow {
        artikelnummer: "100".into(),
        produktname: "P-100".into(),
        eigenbestand_nach_erp: 99,
        rfid_scan: 99,
        differenz: 0,
        id: "stale".into(),
    }];
    let draft = InventurDraft::from_compare(sample_compare(lots, stale));
    let art = draft.art_nr_rows();
    assert_eq!(art.len(), 1);
    assert_eq!(art[0].eigenbestand_nach_erp, 2);
    assert_eq!(art[0].rfid_scan, 1);
    assert_eq!(art[0].differenz, 1);
    assert_eq!(art[0].id, "100");
    assert!(!draft.is_dirty());
}

#[test]
fn stats_stichproben_required_from_ax_quantity() {
    let lots = vec![
        lot("100", "L1", "1", "1", "a", 1),
        lot("100", "L2", "1", "1", "b", 2),
    ];
    let mut compare = sample_compare(lots, vec![]);
    compare.ax_bestand = vec![
        ErpRow {
            artikelnummer: "100".into(),
            produktname: "P".into(),
            lot_id: "L1".into(),
            kennzeichen_3: "IMP".into(),
            ablaufdatum: "-".into(),
            debitorenkonto: "10521".into(),
            eigenbestand_nach_erp: "80".into(),
            extra: vec![],
        },
        ErpRow {
            artikelnummer: "100".into(),
            produktname: "P".into(),
            lot_id: "L2".into(),
            kennzeichen_3: "IMP".into(),
            ablaufdatum: "-".into(),
            debitorenkonto: "10521".into(),
            eigenbestand_nach_erp: "21".into(),
            extra: vec![],
        },
    ];
    let mut draft = InventurDraft::from_compare(compare);
    let before = draft.stats();
    assert_eq!(before.erp_quantity_total, 101);
    assert_eq!(before.stichproben_required, 2);
    assert_eq!(before.stichproben_done, 0);

    draft
        .apply_patches(&[LotIdPatch {
            id: "a".into(),
            stichprobe: Some("X".into()),
            ..Default::default()
        }])
        .unwrap();
    let after = draft.stats();
    assert_eq!(after.stichproben_done, 1);
    assert_eq!(after.stichproben_required, 2);
}

#[test]
fn snapshot_includes_stats_and_sorted_edited_ids() {
    let lots = vec![
        lot("100", "L1", "1", "0", "b", 1),
        lot("100", "L2", "1", "1", "a", 2),
    ];
    let mut draft = InventurDraft::from_compare(sample_compare(lots, vec![]));
    draft
        .bulk_set(&["b".into()], LotIdEditField::Stichprobe, "X")
        .unwrap();
    let snap = draft.snapshot();
    assert_eq!(snap.stats.abweichungen, 1);
    assert_eq!(snap.stats.stichproben_done, 1);
    assert_eq!(snap.edited_ids, vec!["b".to_string()]);
    assert_eq!(snap.art_nr_rows[0].differenz, 1);
}

#[test]
fn erp_flag_cannot_be_changed_via_patch_api() {
    let lots = vec![lot("100", "L1", "1", "0", "a", 1)];
    let mut draft = InventurDraft::from_compare(sample_compare(lots, vec![]));
    draft
        .apply_patches(&[LotIdPatch {
            id: "a".into(),
            rfid_scan: Some("1".into()),
            ..Default::default()
        }])
        .unwrap();
    assert_eq!(draft.lot_id_rows()[0].eigenbestand_nach_erp, "1");
}

#[test]
fn offene_posten_stay_read_only_and_out_of_stats() {
    let mut compare = sample_compare(vec![lot("100", "L1", "1", "1", "a", 1)], vec![]);
    compare.offene_posten = vec![open_position("100", "L9", "2")];
    let draft = InventurDraft::from_compare(compare);

    assert_eq!(draft.offene_posten().len(), 1);
    assert_eq!(
        draft.snapshot().offene_posten.as_slice(),
        draft.offene_posten()
    );
    assert_eq!(
        draft.to_export_result().offene_posten.as_slice(),
        draft.offene_posten()
    );
    assert_eq!(draft.lot_id_rows().len(), 1);
    assert_eq!(draft.stats().abweichungen, 0);
    assert!(!draft.is_dirty());
}

#[test]
fn snapshot_json_without_offene_posten_loads_as_empty() {
    let draft = InventurDraft::from_compare(sample_compare(
        vec![lot("100", "L1", "1", "1", "a", 1)],
        vec![],
    ));
    let mut json = serde_json::to_value(draft.snapshot()).unwrap();
    json.as_object_mut().unwrap().remove("offene_posten");

    let snapshot: EditorSnapshot = serde_json::from_value(json).unwrap();
    assert!(snapshot.offene_posten.is_empty());
    assert_eq!(snapshot.lot_id_rows.len(), 1);
}
