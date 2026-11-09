use crate::domain::types::{ArtNrCompareRow, CompareResult, LotIdCompareRow, OffenePostenRow};

pub(super) fn lot(
    art: &str,
    lot: &str,
    erp: &str,
    rfid: &str,
    id: &str,
    index: u32,
) -> LotIdCompareRow {
    LotIdCompareRow {
        artikelnummer: art.into(),
        produktname: format!("P-{art}"),
        kennzeichen_3: "IMP".into(),
        lot_id: lot.into(),
        erp: erp.into(),
        rfid_scan: rfid.into(),
        ablaufdatum: "-".into(),
        to_do: String::new(),
        anmerkung: String::new(),
        stichprobe: String::new(),
        id: id.into(),
        index,
    }
}

pub(super) fn sample_compare(
    lots: Vec<LotIdCompareRow>,
    stale_art: Vec<ArtNrCompareRow>,
) -> CompareResult {
    CompareResult {
        debitor: "10521".into(),
        kundenname: "Klinik".into(),
        ax_bestand: vec![],
        rfid_scan: vec![],
        bestandsabgleich_artikelnummer: stale_art,
        bestandsabgleich_lot_id: lots,
        offene_posten: vec![],
    }
}

pub(super) fn open_position(art: &str, lot: &str, offen: &str) -> OffenePostenRow {
    OffenePostenRow {
        artikelnummer: art.into(),
        produktname: format!("P-{art}"),
        lot_id: lot.into(),
        ablaufdatum: "01.05.2027".into(),
        offen: offen.into(),
        id: format!("op-{lot}"),
    }
}
