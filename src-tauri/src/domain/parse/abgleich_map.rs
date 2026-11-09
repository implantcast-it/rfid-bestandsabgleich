//! Row mappers from Abgleich sheet cells to domain DTOs.

use std::collections::HashMap;

use uuid::Uuid;

use crate::domain::error::DomainResult;
use crate::domain::normalize::{normalize_gtin, normalize_lot_id};
use crate::domain::parse::abgleich_cells::{get, parse_i64, parse_u32, presence_flag, require_column};
use crate::domain::types::{
    sheet_names, ArtNrCompareRow, ErpRow, LotIdCompareRow, OffenePostenRow, RfidRow, UNBEKANNT,
};

pub(crate) fn map_art_nr_row(
    row: HashMap<String, String>,
    _idx: usize,
) -> DomainResult<ArtNrCompareRow> {
    let ctx = sheet_names::BESTANDSABGLEICH_ARTIKELNUMMER;
    require_column(&row, "Artikelnummer", ctx)?;
    require_column(&row, "Eigenbestand nach ERP", ctx)?;
    require_column(&row, "RFID-Scan", ctx)?;
    require_column(&row, "Differenz", ctx)?;

    let id = get(&row, "id");
    let id = if id.is_empty() {
        Uuid::new_v4().to_string()
    } else {
        id
    };

    Ok(ArtNrCompareRow {
        artikelnummer: get(&row, "Artikelnummer"),
        produktname: {
            let p = get(&row, "Produktname");
            if p.is_empty() {
                UNBEKANNT.to_string()
            } else {
                p
            }
        },
        erp: parse_i64(&get(&row, "Eigenbestand nach ERP")),
        rfid_scan: parse_i64(&get(&row, "RFID-Scan")),
        differenz: parse_i64(&get(&row, "Differenz")),
        id,
    })
}

pub(crate) fn map_lot_id_row(
    row: HashMap<String, String>,
    file_index: usize,
) -> DomainResult<LotIdCompareRow> {
    let ctx = sheet_names::BESTANDSABGLEICH_LOT_ID;
    require_column(&row, "LotId", ctx)?;
    require_column(&row, "Artikelnummer", ctx)?;
    require_column(&row, "Produktname", ctx)?;
    require_column(&row, "Kennzeichen 3", ctx)?;
    require_column(&row, "Eigenbestand nach ERP", ctx)?;
    require_column(&row, "RFID-Scan", ctx)?;

    let id = get(&row, "id");
    let id = if id.is_empty() {
        Uuid::new_v4().to_string()
    } else {
        id
    };

    let index_raw = get(&row, "Index");
    let index = if index_raw.is_empty() {
        (file_index + 1) as u32
    } else {
        parse_u32(&index_raw)
    };

    let ablauf = get(&row, "Ablaufdatum");
    let ablaufdatum = if ablauf.is_empty() {
        "-".into()
    } else {
        ablauf
    };

    Ok(LotIdCompareRow {
        artikelnummer: get(&row, "Artikelnummer"),
        produktname: get(&row, "Produktname"),
        kennzeichen_3: get(&row, "Kennzeichen 3"),
        lot_id: normalize_lot_id(&get(&row, "LotId")),
        erp: presence_flag(&get(&row, "Eigenbestand nach ERP")),
        rfid_scan: presence_flag(&get(&row, "RFID-Scan")),
        ablaufdatum,
        to_do: get(&row, "To Do"),
        anmerkung: get(&row, "Anmerkung"),
        stichprobe: get(&row, "Stichprobe"),
        id,
        index,
    })
}

pub(crate) fn map_erp_row(row: HashMap<String, String>) -> ErpRow {
    let kennzeichen_3 = {
        let kz3 = get(&row, "Kennzeichen 3");
        if !kz3.is_empty() {
            kz3
        } else {
            let kz = get(&row, "Kennzeichen");
            if kz.is_empty() {
                UNBEKANNT.to_string()
            } else {
                kz
            }
        }
    };

    let ablauf = get(&row, "Ablaufdatum");
    ErpRow {
        artikelnummer: {
            let a = get(&row, "Artikelnummer");
            if a.is_empty() {
                UNBEKANNT.to_string()
            } else {
                a
            }
        },
        produktname: {
            let p = get(&row, "Produktname");
            if p.is_empty() {
                UNBEKANNT.to_string()
            } else {
                p
            }
        },
        lot_id: normalize_lot_id(&get(&row, "LotId")),
        kennzeichen_3,
        ablaufdatum: if ablauf.is_empty() {
            "-".into()
        } else {
            ablauf
        },
        debitorenkonto: get(&row, "Debitorenkonto"),
        erp: get(&row, "Eigenbestand nach ERP"),
        extra: vec![],
    }
}

pub(crate) fn map_rfid_row(row: HashMap<String, String>) -> RfidRow {
    RfidRow {
        gtin: normalize_gtin(&get(&row, "GTIN")),
        lot_id: normalize_lot_id(&get(&row, "LotId")),
        kennung_1: get(&row, "Kennung 1"),
        debitorennummer: get(&row, "Debitorennummer"),
        erfasst_um: get(&row, "Erfasst um"),
        artikelnummer: {
            let a = get(&row, "Artikelnummer");
            if a.is_empty() {
                UNBEKANNT.to_string()
            } else {
                a
            }
        },
        produktname: {
            let p = get(&row, "Produktname");
            if p.is_empty() {
                UNBEKANNT.to_string()
            } else {
                p
            }
        },
        kennzeichen_3: {
            let k = get(&row, "Kennzeichen 3");
            if k.is_empty() {
                UNBEKANNT.to_string()
            } else {
                k
            }
        },
    }
}

pub(crate) fn map_offene_posten_row(row: HashMap<String, String>) -> OffenePostenRow {
    let id = get(&row, "id");
    let ablauf = get(&row, "Ablaufdatum");
    OffenePostenRow {
        artikelnummer: get(&row, "Artikelnummer"),
        produktname: get(&row, "Produktname"),
        lot_id: normalize_lot_id(&get(&row, "LotId")),
        ablaufdatum: if ablauf.is_empty() {
            "-".into()
        } else {
            ablauf
        },
        offen: get(&row, "Offen"),
        id: if id.is_empty() {
            Uuid::new_v4().to_string()
        } else {
            id
        },
    }
}
