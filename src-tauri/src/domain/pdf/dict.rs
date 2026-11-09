//! Typst dictionary builders for Abgleich PDF templates.

use chrono::{DateTime, Local};
use typst::foundations::{Dict, IntoValue, Value};

use crate::domain::pdf::types::{PdfExportInput, PdfTotals};
use crate::domain::types::{LotIdCompareRow, OffenePostenRow};

pub(crate) fn resolve_generated_at(input: &PdfExportInput) -> DateTime<Local> {
    if let Some(raw) = input.generated_at.as_deref() {
        if let Ok(dt) = DateTime::parse_from_rfc3339(raw) {
            return dt.with_timezone(&Local);
        }
    }
    Local::now()
}

fn has_kundenname(kundenname: &str) -> bool {
    let name = kundenname.trim();
    !name.is_empty() && !name.eq_ignore_ascii_case("Unbekannt")
}

fn is_mismatch(erp: &str, rfid: &str) -> bool {
    erp.trim() != rfid.trim()
}

pub(crate) fn lot_to_value(lot: &LotIdCompareRow) -> Value {
    let mut dict = Dict::new();
    dict.insert("index".into(), (lot.index as i64).into_value());
    dict.insert("kennz".into(), lot.kennzeichen_3.clone().into_value());
    dict.insert("artikel".into(), lot.artikelnummer.clone().into_value());
    dict.insert("produkt".into(), lot.produktname.clone().into_value());
    dict.insert("lot_id".into(), lot.lot_id.clone().into_value());
    dict.insert("verfall".into(), lot.ablaufdatum.clone().into_value());
    dict.insert("erp".into(), lot.eigenbestand_nach_erp.clone().into_value());
    dict.insert("rfid".into(), lot.rfid_scan.clone().into_value());
    dict.insert("todo".into(), lot.to_do.clone().into_value());
    dict.insert("anmerkung".into(), lot.anmerkung.clone().into_value());
    dict.insert("stich".into(), lot.stichprobe.clone().into_value());
    dict.insert(
        "mismatch".into(),
        is_mismatch(&lot.eigenbestand_nach_erp, &lot.rfid_scan).into_value(),
    );
    Value::Dict(dict)
}

fn offene_posten_to_value(row: &OffenePostenRow) -> Value {
    let mut dict = Dict::new();
    dict.insert("artikel".into(), row.artikelnummer.clone().into_value());
    dict.insert("produkt".into(), row.produktname.clone().into_value());
    dict.insert("lot_id".into(), row.lot_id.clone().into_value());
    dict.insert("verfall".into(), row.ablaufdatum.clone().into_value());
    dict.insert("offen".into(), row.offen.clone().into_value());
    Value::Dict(dict)
}

pub(crate) fn input_to_dict(
    input: &PdfExportInput,
    totals: PdfTotals,
    datum: &str,
    uhrzeit: &str,
) -> Dict {
    let mut dict = Dict::new();
    dict.insert("debitor".into(), input.debitor.clone().into_value());
    dict.insert("kundenname".into(), input.kundenname.clone().into_value());
    dict.insert(
        "has_kundenname".into(),
        has_kundenname(&input.kundenname).into_value(),
    );
    dict.insert("datum".into(), datum.into_value());
    dict.insert("uhrzeit".into(), uhrzeit.into_value());
    dict.insert("anzahl".into(), (totals.anzahl as i64).into_value());
    dict.insert("soll".into(), totals.soll.into_value());
    dict.insert("ist".into(), totals.ist.into_value());
    dict.insert("abweichung".into(), totals.abweichung.into_value());

    let lots: Vec<Value> = input.lots.iter().map(lot_to_value).collect();
    dict.insert("lots".into(), lots.into_value());

    let offene_posten: Vec<Value> = input
        .offene_posten
        .iter()
        .map(offene_posten_to_value)
        .collect();
    dict.insert("offene_posten".into(), offene_posten.into_value());
    dict
}
