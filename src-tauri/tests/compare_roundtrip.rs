//! Integration / golden tests for the domain pipeline.
//!
//! Builds tiny synthetic Master + ERP workbooks with `rust_xlsxwriter`,
//! RFID TXT fixtures, then runs parse → compare → export → reload.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use calamine::{open_workbook_auto, Data, Reader};
use pretty_assertions::assert_eq;
use rfid_bestandsabgleich::{
    load_abgleich_xlsx, load_gtin_catalog, parse_erp, parse_rfid, run_compare,
    write_abgleich_xlsx, CompareInput, CompareResult, DomainError, ErpImport,
};
use rust_xlsxwriter::Workbook;
use tempfile::TempDir;

fn write_master(path: &Path) {
    let mut wb = Workbook::new();
    let sheet = wb.add_worksheet();
    sheet.set_name("GTIN").unwrap();
    for (c, h) in ["GTIN", "Artikelnummer", "Produktname", "Kennzeichen 3"]
        .iter()
        .enumerate()
    {
        sheet.write_string(0, c as u16, *h).unwrap();
    }
    sheet.write_string(1, 0, "04048844149895").unwrap();
    sheet.write_string(1, 1, "100").unwrap();
    sheet.write_string(1, 2, "Implant A").unwrap();
    sheet.write_string(1, 3, "IMP").unwrap();
    sheet.write_string(2, 0, "04048844050450").unwrap();
    sheet.write_string(2, 1, "200").unwrap();
    sheet.write_string(2, 2, "Instrument B").unwrap();
    sheet.write_string(2, 3, "INST").unwrap();
    wb.save(path).unwrap();
}

fn write_erp(path: &Path) {
    let mut wb = Workbook::new();
    let sheet = wb.add_worksheet();
    sheet.set_name("ERP").unwrap();
    let headers = [
        "Artikelnummer",
        "Produktname",
        "LotId",
        "Kennzeichen 3",
        "Ablaufdatum",
        "Debitorenkonto",
        "Physischer Bestand",
    ];
    for (c, h) in headers.iter().enumerate() {
        sheet.write_string(0, c as u16, *h).unwrap();
    }
    // Match on L1; missing scan for L2; empty LotId still counts for ArtNr
    let rows = [
        ("100", "Implant A", "L1", "IMP", "1/1/2030", "10521", "1"),
        ("100", "Implant A", "L2", "IMP", "1/1/2030", "10521", "1"),
        ("100", "Implant A", "", "IMP", "1/1/2030", "10521", "1"),
        ("200", "Instrument B", "L200", "INST", "2/2/2030", "10521", "1"),
    ];
    for (r, row) in rows.iter().enumerate() {
        let r = (r + 1) as u32;
        sheet.write_string(r, 0, row.0).unwrap();
        sheet.write_string(r, 1, row.1).unwrap();
        sheet.write_string(r, 2, row.2).unwrap();
        sheet.write_string(r, 3, row.3).unwrap();
        sheet.write_string(r, 4, row.4).unwrap();
        sheet.write_string(r, 5, row.5).unwrap();
        sheet.write_string(r, 6, row.6).unwrap();
    }
    wb.save(path).unwrap();
}

/// ERP fixture with an `Insgesamt bestellt` column: blank cells are stock rows,
/// numbers are Offene Posten (ordered, physical count 0).
fn write_erp_with_open_positions(path: &Path) {
    let mut wb = Workbook::new();
    let sheet = wb.add_worksheet();
    sheet.set_name("ERP").unwrap();
    let headers = [
        "Artikelnummer",
        "Produktname",
        "LotId",
        "Kennzeichen 3",
        "Ablaufdatum",
        "Debitorenkonto",
        "Physischer Bestand",
        "Insgesamt bestellt",
    ];
    for (c, h) in headers.iter().enumerate() {
        sheet.write_string(0, c as u16, *h).unwrap();
    }
    let rows = [
        ("100", "Implant A", "L1", "1", None),
        ("200", "Instrument B", "L200", "1", None),
        ("300", "Ordered C", "L300", "0", Some(2.0)),
        ("100", "Implant A", "LOPEN1", "0", Some(1.0)),
    ];
    for (r, (artikel, produkt, lot, bestand, offen)) in rows.iter().enumerate() {
        let r = (r + 1) as u32;
        sheet.write_string(r, 0, *artikel).unwrap();
        sheet.write_string(r, 1, *produkt).unwrap();
        sheet.write_string(r, 2, *lot).unwrap();
        sheet.write_string(r, 3, "IMP").unwrap();
        sheet.write_string(r, 4, "1/1/2030").unwrap();
        sheet.write_string(r, 5, "10521").unwrap();
        sheet.write_string(r, 6, *bestand).unwrap();
        if let Some(offen) = offen {
            sheet.write_number(r, 7, *offen).unwrap();
        }
    }
    wb.save(path).unwrap();
}

fn write_rfid(path: &Path) {
    let text = "\
[Inventory 01.01.2026 10:00]
04048844149895,L1,QM,10521,10:01:00
04048844050450,L200,QM,10521,10:02:00
04048844149895,L_EXTRA,QM,10521,10:03:00
99999999999999,L_UNKNOWN,QM,10521,10:04:00
";
    std::fs::write(path, text).unwrap();
}

fn sheet_rows(path: &Path, name: &str) -> Vec<HashMap<String, String>> {
    let mut wb = open_workbook_auto(path).unwrap();
    let range = wb.worksheet_range(name).unwrap();
    let mut iter = range.rows();
    let headers: Vec<String> = iter
        .next()
        .unwrap()
        .iter()
        .map(|c| match c {
            Data::String(s) => s.clone(),
            other => other.to_string(),
        })
        .collect();
    let mut out = Vec::new();
    for row in iter {
        let mut map = HashMap::new();
        for (i, cell) in row.iter().enumerate() {
            let key = headers.get(i).cloned().unwrap_or_default();
            let value = match cell {
                Data::String(s) => s.clone(),
                Data::Float(f) => {
                    if f.fract() == 0.0 {
                        format!("{:.0}", f)
                    } else {
                        f.to_string()
                    }
                }
                Data::Int(i) => i.to_string(),
                Data::Empty => String::new(),
                other => other.to_string(),
            };
            map.insert(key, value);
        }
        out.push(map);
    }
    out
}

fn fixture_dir() -> (TempDir, PathBuf, PathBuf, PathBuf) {
    let dir = TempDir::new().unwrap();
    let master = dir.path().join("master.xlsx");
    let erp = dir.path().join("erp.xlsx");
    let rfid = dir.path().join("rfid.txt");
    write_master(&master);
    write_erp(&erp);
    write_rfid(&rfid);
    (dir, master, erp, rfid)
}

#[test]
fn end_to_end_compare_semantics() {
    let (_dir, master, erp, rfid) = fixture_dir();

    let catalog = load_gtin_catalog(&master).unwrap();
    assert_eq!(catalog.len(), 2);

    let ErpImport {
        rows: erp_rows,
        debitor,
        offene_posten,
    } = parse_erp(&erp).unwrap();
    assert_eq!(debitor, "10521");
    assert_eq!(erp_rows.len(), 4);
    assert_eq!(erp_rows[0].erp, "1");
    assert!(offene_posten.is_empty());

    let rfid_rows = parse_rfid(&rfid, &catalog).unwrap();
    // banner dropped; underscores stripped → L_UNKNOWN becomes LUNKNOWN
    assert_eq!(rfid_rows.len(), 4);
    let unknown = rfid_rows.iter().find(|r| r.lot_id == "LUNKNOWN").unwrap();
    assert_eq!(unknown.artikelnummer, "Unbekannt");

    let result = run_compare(CompareInput {
        erp: erp_rows,
        rfid: rfid_rows,
        debitor,
        kundenname: "Unbekannt".into(),
        offene_posten,
    });

    // RFID lots: L1(100), L200(200), LEXTRA(100), LUNKNOWN(Unbekannt)
    let art100 = result
        .bestandsabgleich_artikelnummer
        .iter()
        .find(|r| r.artikelnummer == "100")
        .unwrap();
    assert_eq!(art100.erp, 3);
    assert_eq!(art100.rfid_scan, 2);
    assert_eq!(art100.differenz, 1);

    let by_lot: HashMap<_, _> = result
        .bestandsabgleich_lot_id
        .iter()
        .map(|r| (r.lot_id.as_str(), r))
        .collect();
    assert_eq!(by_lot["L1"].erp, "1");
    assert_eq!(by_lot["L1"].rfid_scan, "1");
    assert_eq!(by_lot["L2"].rfid_scan, "0");
    assert_eq!(by_lot["LEXTRA"].erp, "0");
    assert_eq!(by_lot["LEXTRA"].rfid_scan, "1");

    let first_kz = &result.bestandsabgleich_lot_id[0].kennzeichen_3;
    assert!(first_kz == "IMP" || first_kz == "Unbekannt" || first_kz == "INST");
}

#[test]
fn export_roundtrip_preserves_required_sheets_and_counts() {
    let (_dir, master, erp, rfid) = fixture_dir();
    let catalog = load_gtin_catalog(&master).unwrap();
    let ErpImport {
        rows: erp_rows,
        debitor,
        offene_posten,
    } = parse_erp(&erp).unwrap();
    let rfid_rows = parse_rfid(&rfid, &catalog).unwrap();

    let result = run_compare(CompareInput {
        erp: erp_rows,
        rfid: rfid_rows,
        debitor,
        kundenname: "Unbekannt".into(),
        offene_posten,
    });

    let out = _dir.path().join("abgleich.xlsx");
    write_abgleich_xlsx(&result, &out).unwrap();

    let wb = open_workbook_auto(&out).unwrap();
    let names = wb.sheet_names().to_owned();
    assert!(names.contains(&"Ax-Bestand".to_string()));
    assert!(names.contains(&"RFID-Scan".to_string()));
    assert!(names.contains(&"Bestandsabgleich Artikelnummer".to_string()));
    assert!(names.contains(&"Bestandsabgleich LotId".to_string()));
    assert!(!names.contains(&"Barcode-Scan".to_string()));
    assert!(!names.contains(&"Vergleich der Scans".to_string()));

    let art_rows = sheet_rows(&out, "Bestandsabgleich Artikelnummer");
    let art100 = art_rows
        .iter()
        .find(|r| r.get("Artikelnummer").map(String::as_str) == Some("100"))
        .unwrap();
    assert_eq!(
        art100.get("Eigenbestand nach ERP").map(String::as_str),
        Some("3")
    );
    assert_eq!(art100.get("RFID-Scan").map(String::as_str), Some("2"));
    assert_eq!(art100.get("Differenz").map(String::as_str), Some("1"));

    let lot_rows = sheet_rows(&out, "Bestandsabgleich LotId");
    assert_eq!(lot_rows.len(), result.bestandsabgleich_lot_id.len());
    assert!(lot_rows
        .iter()
        .any(|r| r.get("LotId").map(String::as_str) == Some("L1")));
}

#[test]
fn erp_accepts_legacy_kennzeichen_column() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("erp_kz.xlsx");
    let mut wb = Workbook::new();
    let sheet = wb.add_worksheet();
    for (c, h) in [
        "Artikelnummer",
        "Produktname",
        "LotId",
        "Kennzeichen",
        "Debitorenkonto",
        "Physischer Bestand",
    ]
    .iter()
    .enumerate()
    {
        sheet.write_string(0, c as u16, *h).unwrap();
    }
    sheet.write_string(1, 0, "100").unwrap();
    sheet.write_string(1, 1, "Implant").unwrap();
    sheet.write_string(1, 2, "L1").unwrap();
    sheet.write_string(1, 3, "SIEB").unwrap();
    sheet.write_string(1, 4, "999").unwrap();
    sheet.write_string(1, 5, "1").unwrap();
    wb.save(&path).unwrap();

    let erp = parse_erp(&path).unwrap();
    assert_eq!(erp.debitor, "999");
    assert_eq!(erp.rows[0].kennzeichen_3, "SIEB");
    assert_eq!(erp.rows[0].erp, "1");
    assert!(erp.offene_posten.is_empty());
}

/// Writes master, RFID and the ERP fixture from `write_erp_fixture` into `dir`, then runs the compare.
fn compare_from_fixtures(
    dir: &TempDir,
    write_erp_fixture: fn(&Path),
) -> CompareResult {
    let master = dir.path().join("master.xlsx");
    let erp = dir.path().join("erp.xlsx");
    let rfid = dir.path().join("rfid.txt");
    write_master(&master);
    write_erp_fixture(&erp);
    write_rfid(&rfid);
    let catalog = load_gtin_catalog(&master).unwrap();
    let ErpImport {
        rows,
        debitor,
        offene_posten,
    } = parse_erp(&erp).unwrap();
    let rfid_rows = parse_rfid(&rfid, &catalog).unwrap();
    run_compare(CompareInput {
        erp: rows,
        rfid: rfid_rows,
        debitor,
        kundenname: "Unbekannt".into(),
        offene_posten,
    })
}

fn build_compare_result(dir: &TempDir) -> CompareResult {
    compare_from_fixtures(dir, write_erp)
}

#[test]
fn load_abgleich_roundtrip_preserves_compare_result() {
    let dir = TempDir::new().unwrap();
    let mut result = build_compare_result(&dir);

    // Simulate editor annotations surviving export/reload.
    if let Some(lot) = result
        .bestandsabgleich_lot_id
        .iter_mut()
        .find(|r| r.lot_id == "L2")
    {
        lot.to_do = "interne Berechnung".into();
        lot.anmerkung = "in Klärung".into();
        lot.stichprobe = "X".into();
    }

    let out = dir.path().join("abgleich.xlsx");
    write_abgleich_xlsx(&result, &out).unwrap();
    let loaded = load_abgleich_xlsx(&out).unwrap();

    assert_eq!(loaded.debitor, "10521");
    assert_eq!(loaded.ax_bestand.len(), result.ax_bestand.len());
    assert_eq!(loaded.rfid_scan.len(), result.rfid_scan.len());
    assert_eq!(
        loaded.bestandsabgleich_artikelnummer.len(),
        result.bestandsabgleich_artikelnummer.len()
    );
    assert_eq!(
        loaded.bestandsabgleich_lot_id.len(),
        result.bestandsabgleich_lot_id.len()
    );

    let art100 = loaded
        .bestandsabgleich_artikelnummer
        .iter()
        .find(|r| r.artikelnummer == "100")
        .unwrap();
    assert_eq!(art100.erp, 3);
    assert_eq!(art100.rfid_scan, 2);
    assert_eq!(art100.differenz, 1);

    let orig_art = result
        .bestandsabgleich_artikelnummer
        .iter()
        .find(|r| r.artikelnummer == "100")
        .unwrap();
    assert_eq!(art100.id, orig_art.id);

    let lot2 = loaded
        .bestandsabgleich_lot_id
        .iter()
        .find(|r| r.lot_id == "L2")
        .unwrap();
    assert_eq!(lot2.erp, "1");
    assert_eq!(lot2.rfid_scan, "0");
    assert_eq!(lot2.to_do, "interne Berechnung");
    assert_eq!(lot2.anmerkung, "in Klärung");
    assert_eq!(lot2.stichprobe, "X");
}

#[test]
fn load_abgleich_rejects_missing_required_sheet() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("bad.xlsx");
    let mut wb = Workbook::new();
    let sheet = wb.add_worksheet();
    sheet.set_name("Bestandsabgleich Artikelnummer").unwrap();
    sheet.write_string(0, 0, "Artikelnummer").unwrap();
    sheet.write_string(0, 1, "Eigenbestand nach ERP").unwrap();
    sheet.write_string(0, 2, "RFID-Scan").unwrap();
    sheet.write_string(0, 3, "Differenz").unwrap();
    sheet.write_string(1, 0, "100").unwrap();
    sheet.write_number(1, 1, 1.0).unwrap();
    sheet.write_number(1, 2, 0.0).unwrap();
    sheet.write_number(1, 3, 1.0).unwrap();
    // Intentionally omit Bestandsabgleich LotId
    wb.save(&path).unwrap();

    let err = load_abgleich_xlsx(&path).unwrap_err();
    match err {
        DomainError::InvalidAbgleich { message } => {
            assert!(message.contains("Bestandsabgleich LotId"));
        }
        other => panic!("expected InvalidAbgleich, got {other:?}"),
    }
}

#[test]
fn load_abgleich_accepts_legacy_lotid_column_order() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("legacy.xlsx");
    let mut wb = Workbook::new();

    {
        let art = wb.add_worksheet();
        art.set_name("Bestandsabgleich Artikelnummer").unwrap();
        for (c, h) in [
            "Artikelnummer",
            "Produktname",
            "Eigenbestand nach ERP",
            "RFID-Scan",
            "Differenz",
            "id",
        ]
        .iter()
        .enumerate()
        {
            art.write_string(0, c as u16, *h).unwrap();
        }
        art.write_string(1, 0, "100").unwrap();
        art.write_string(1, 1, "Implant").unwrap();
        art.write_number(1, 2, 1.0).unwrap();
        art.write_number(1, 3, 1.0).unwrap();
        art.write_number(1, 4, 0.0).unwrap();
        art.write_string(1, 5, "art-id").unwrap();
    }

    // download.ts order: Index first
    {
        let lot = wb.add_worksheet();
        lot.set_name("Bestandsabgleich LotId").unwrap();
        for (c, h) in [
            "Index",
            "LotId",
            "Artikelnummer",
            "Produktname",
            "Kennzeichen 3",
            "Ablaufdatum",
            "Eigenbestand nach ERP",
            "RFID-Scan",
            "To Do",
            "Anmerkung",
            "Stichprobe",
            "id",
        ]
        .iter()
        .enumerate()
        {
            lot.write_string(0, c as u16, *h).unwrap();
        }
        lot.write_number(1, 0, 1.0).unwrap();
        lot.write_string(1, 1, "L1").unwrap();
        lot.write_string(1, 2, "100").unwrap();
        lot.write_string(1, 3, "Implant").unwrap();
        lot.write_string(1, 4, "IMP").unwrap();
        lot.write_string(1, 5, "1/1/2030").unwrap();
        lot.write_string(1, 6, "1").unwrap();
        lot.write_string(1, 7, "1").unwrap();
        lot.write_string(1, 8, "").unwrap();
        lot.write_string(1, 9, "").unwrap();
        lot.write_string(1, 10, "").unwrap();
        lot.write_string(1, 11, "lot-id").unwrap();
    }

    wb.save(&path).unwrap();

    let loaded = load_abgleich_xlsx(&path).unwrap();
    assert_eq!(loaded.debitor, "Unbekannt");
    assert!(loaded.ax_bestand.is_empty());
    assert!(loaded.rfid_scan.is_empty());
    assert_eq!(loaded.bestandsabgleich_lot_id.len(), 1);
    assert_eq!(loaded.bestandsabgleich_lot_id[0].lot_id, "L1");
    assert_eq!(loaded.bestandsabgleich_lot_id[0].index, 1);
    assert_eq!(loaded.bestandsabgleich_lot_id[0].id, "lot-id");
    assert_eq!(loaded.bestandsabgleich_artikelnummer[0].id, "art-id");
}

#[test]
fn load_abgleich_minimal_two_sheets_only() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("minimal.xlsx");
    let mut wb = Workbook::new();

    {
        let art = wb.add_worksheet();
        art.set_name("Bestandsabgleich Artikelnummer").unwrap();
        for (c, h) in [
            "Artikelnummer",
            "Eigenbestand nach ERP",
            "RFID-Scan",
            "Differenz",
        ]
        .iter()
        .enumerate()
        {
            art.write_string(0, c as u16, *h).unwrap();
        }
        art.write_string(1, 0, "100").unwrap();
        art.write_number(1, 1, 2.0).unwrap();
        art.write_number(1, 2, 1.0).unwrap();
        art.write_number(1, 3, 1.0).unwrap();
    }

    {
        let lot = wb.add_worksheet();
        lot.set_name("Bestandsabgleich LotId").unwrap();
        for (c, h) in [
            "LotId",
            "Artikelnummer",
            "Produktname",
            "Kennzeichen 3",
            "Eigenbestand nach ERP",
            "RFID-Scan",
        ]
        .iter()
        .enumerate()
        {
            lot.write_string(0, c as u16, *h).unwrap();
        }
        lot.write_string(1, 0, "L1").unwrap();
        lot.write_string(1, 1, "100").unwrap();
        lot.write_string(1, 2, "Implant").unwrap();
        lot.write_string(1, 3, "IMP").unwrap();
        lot.write_string(1, 4, "1").unwrap();
        lot.write_string(1, 5, "0").unwrap();
    }

    wb.save(&path).unwrap();

    let loaded = load_abgleich_xlsx(&path).unwrap();
    assert_eq!(loaded.debitor, "Unbekannt");
    assert!(loaded.ax_bestand.is_empty());
    assert!(loaded.rfid_scan.is_empty());
    assert_eq!(loaded.bestandsabgleich_artikelnummer[0].differenz, 1);
    assert_eq!(loaded.bestandsabgleich_lot_id[0].rfid_scan, "0");
    assert_eq!(loaded.bestandsabgleich_lot_id[0].ablaufdatum, "-");
    assert_eq!(loaded.bestandsabgleich_lot_id[0].index, 1);
    assert!(!loaded.bestandsabgleich_lot_id[0].id.is_empty());
}

#[test]
fn parse_erp_splits_insgesamt_bestellt_into_offene_posten() {
    let dir = TempDir::new().unwrap();
    let erp = dir.path().join("erp.xlsx");
    write_erp_with_open_positions(&erp);

    let ErpImport {
        rows,
        debitor,
        offene_posten,
    } = parse_erp(&erp).unwrap();
    assert_eq!(debitor, "10521");
    let stock_lots: Vec<&str> = rows.iter().map(|r| r.lot_id.as_str()).collect();
    assert_eq!(stock_lots, ["L1", "L200"]);

    // Sorted by Artikelnummer (numeric), then LotId.
    let open: Vec<(&str, &str, &str, &str, &str)> = offene_posten
        .iter()
        .map(|r| {
            (
                r.artikelnummer.as_str(),
                r.produktname.as_str(),
                r.lot_id.as_str(),
                r.ablaufdatum.as_str(),
                r.offen.as_str(),
            )
        })
        .collect();
    assert_eq!(
        open,
        [
            ("100", "Implant A", "LOPEN1", "1/1/2030", "1"),
            ("300", "Ordered C", "L300", "1/1/2030", "2"),
        ]
    );
}

#[test]
fn open_positions_stay_out_of_the_abgleich_and_roundtrip_through_excel() {
    let dir = TempDir::new().unwrap();
    let result = compare_from_fixtures(&dir, write_erp_with_open_positions);

    assert_eq!(result.offene_posten.len(), 2);
    // ART 100 counts only its stock lot L1 (the open lot LOPEN1 is excluded).
    let art100 = result
        .bestandsabgleich_artikelnummer
        .iter()
        .find(|r| r.artikelnummer == "100")
        .unwrap();
    assert_eq!(art100.erp, 1);
    assert_eq!(art100.rfid_scan, 2);
    assert!(result
        .bestandsabgleich_artikelnummer
        .iter()
        .all(|r| r.artikelnummer != "300"));
    assert!(result
        .bestandsabgleich_lot_id
        .iter()
        .all(|r| r.lot_id != "LOPEN1" && r.lot_id != "L300"));

    let out = dir.path().join("abgleich.xlsx");
    write_abgleich_xlsx(&result, &out).unwrap();

    let open_rows = sheet_rows(&out, "Offene Posten");
    assert_eq!(open_rows.len(), 2);
    assert_eq!(
        open_rows[1].get("Artikelnummer").map(String::as_str),
        Some("300")
    );
    assert_eq!(open_rows[1].get("LotId").map(String::as_str), Some("L300"));
    assert_eq!(open_rows[1].get("Offen").map(String::as_str), Some("2"));

    let loaded = load_abgleich_xlsx(&out).unwrap();
    assert_eq!(loaded.offene_posten.len(), 2);
    assert_eq!(loaded.offene_posten[1].lot_id, "L300");
    assert_eq!(loaded.offene_posten[1].offen, "2");
    assert_eq!(
        loaded.bestandsabgleich_lot_id.len(),
        result.bestandsabgleich_lot_id.len()
    );
}

#[test]
fn empty_offene_posten_still_writes_headed_sheet() {
    let dir = TempDir::new().unwrap();
    let result = build_compare_result(&dir);
    assert!(result.offene_posten.is_empty());

    let out = dir.path().join("abgleich.xlsx");
    write_abgleich_xlsx(&result, &out).unwrap();

    let wb = open_workbook_auto(&out).unwrap();
    assert!(wb.sheet_names().contains(&"Offene Posten".to_string()));
    assert!(sheet_rows(&out, "Offene Posten").is_empty());
    assert!(load_abgleich_xlsx(&out).unwrap().offene_posten.is_empty());
}
