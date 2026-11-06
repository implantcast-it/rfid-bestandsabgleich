//! Load a previously exported Abgleich workbook into [`CompareResult`].
//!
//! ## Contract
//!
//! **Required sheets** (same as v4 `loadComparisonFile`):
//! - `Bestandsabgleich Artikelnummer`
//! - `Bestandsabgleich LotId`
//!
//! **Optional sheets** (empty if missing): `Ax-Bestand`, `RFID-Scan`, `Offene Posten`.
//!
//! Barcode / Master leftover sheets are ignored. Columns are bound **by header
//! name** so legacy exports (e.g. `Index` first on LotId) still load.
//!
//! Values are trusted as stored — this does **not** re-run compare.

use std::collections::HashMap;
use std::path::Path;

use calamine::Reader;
use uuid::Uuid;

use crate::domain::error::{DomainError, DomainResult};
use crate::domain::normalize::{cell_to_string, normalize_gtin, normalize_lot_id};
use crate::domain::parse::excel::{open_workbook, read_range_rows};
use crate::domain::types::{
    sheet_names, ArtNrCompareRow, CompareResult, ErpRow, LotIdCompareRow, OffenePostenRow,
    RfidRow, UNBEKANNT,
};

/// Load an Abgleich `.xlsx` from disk into a typed [`CompareResult`].
pub fn load_abgleich_xlsx(path: &Path) -> DomainResult<CompareResult> {
    if !path.exists() {
        return Err(DomainError::FileNotFound(path.to_path_buf()));
    }

    let mut workbook = open_workbook(path)?;
    let names = workbook.sheet_names().to_owned();

    require_sheet(&names, sheet_names::BESTANDSABGLEICH_ARTIKELNUMMER)?;
    require_sheet(&names, sheet_names::BESTANDSABGLEICH_LOT_ID)?;

    let art_rows = read_range_rows(
        &mut workbook,
        path,
        sheet_names::BESTANDSABGLEICH_ARTIKELNUMMER,
    )?;
    let lot_rows =
        read_range_rows(&mut workbook, path, sheet_names::BESTANDSABGLEICH_LOT_ID)?;

    let ax_bestand = if names.iter().any(|n| n == sheet_names::AX_BESTAND) {
        let rows = read_range_rows(&mut workbook, path, sheet_names::AX_BESTAND)?;
        rows.into_iter().map(map_erp_row).collect()
    } else {
        Vec::new()
    };

    let rfid_scan = if names.iter().any(|n| n == sheet_names::RFID_SCAN) {
        let rows = read_range_rows(&mut workbook, path, sheet_names::RFID_SCAN)?;
        rows.into_iter().map(map_rfid_row).collect()
    } else {
        Vec::new()
    };

    let offene_posten = if names.iter().any(|n| n == sheet_names::OFFENE_POSTEN) {
        read_optional_rows(&mut workbook, path, sheet_names::OFFENE_POSTEN)?
            .into_iter()
            .map(map_offene_posten_row)
            .collect()
    } else {
        Vec::new()
    };

    let bestandsabgleich_artikelnummer = art_rows
        .into_iter()
        .enumerate()
        .map(|(i, row)| map_art_nr_row(row, i))
        .collect::<DomainResult<Vec<_>>>()?;

    let mut bestandsabgleich_lot_id = lot_rows
        .into_iter()
        .enumerate()
        .map(|(i, row)| map_lot_id_row(row, i))
        .collect::<DomainResult<Vec<_>>>()?;

    // If Index was missing on every row, assign 1..n in file order.
    if bestandsabgleich_lot_id.iter().all(|r| r.index == 0) {
        for (idx, row) in bestandsabgleich_lot_id.iter_mut().enumerate() {
            row.index = (idx + 1) as u32;
        }
    }

    let debitor = ax_bestand
        .iter()
        .map(|r| r.debitorenkonto.trim())
        .find(|s| !s.is_empty())
        .unwrap_or(UNBEKANNT)
        .to_string();

    Ok(CompareResult {
        debitor,
        // Name resolution is catalog-based; reload leaves Unbekannt until UI resolves.
        kundenname: UNBEKANNT.to_string(),
        ax_bestand,
        rfid_scan,
        bestandsabgleich_artikelnummer,
        bestandsabgleich_lot_id,
        offene_posten,
    })
}

/// Rows of an optional sheet. A sheet without any cells has no header row and reads as empty.
fn read_optional_rows(
    workbook: &mut calamine::Sheets<std::io::BufReader<std::fs::File>>,
    path: &Path,
    sheet: &str,
) -> DomainResult<Vec<HashMap<String, String>>> {
    match read_range_rows(workbook, path, sheet) {
        Err(DomainError::SheetMissing { .. }) => Ok(Vec::new()),
        other => other,
    }
}

fn require_sheet(names: &[String], sheet: &str) -> DomainResult<()> {
    if names.iter().any(|n| n == sheet) {
        Ok(())
    } else {
        Err(DomainError::InvalidAbgleich {
            message: format!("Erforderliche Sheets fehlen (u. a. „{sheet}“)."),
        })
    }
}

fn require_column(
    row: &HashMap<String, String>,
    column: &str,
    context: &str,
) -> DomainResult<()> {
    if row.contains_key(column) {
        Ok(())
    } else {
        Err(DomainError::InvalidAbgleich {
            message: format!("Erforderliche Spalte fehlt in {context}: {column}."),
        })
    }
}

fn get(row: &HashMap<String, String>, key: &str) -> String {
    row.get(key)
        .map(|s| cell_to_string(s))
        .unwrap_or_default()
}

fn parse_i64(raw: &str) -> i64 {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return 0;
    }
    if let Ok(v) = trimmed.parse::<i64>() {
        return v;
    }
    trimmed
        .parse::<f64>()
        .map(|f| f as i64)
        .unwrap_or(0)
}

fn parse_u32(raw: &str) -> u32 {
    let v = parse_i64(raw);
    if v < 0 {
        0
    } else {
        v as u32
    }
}

/// Coerce presence / flag cells to `"1"` or `"0"`.
fn presence_flag(raw: &str) -> String {
    let t = raw.trim();
    if t == "1" || t.eq_ignore_ascii_case("true") {
        return "1".into();
    }
    if let Ok(n) = t.parse::<f64>() {
        if (n - 1.0).abs() < f64::EPSILON {
            return "1".into();
        }
    }
    "0".into()
}

fn map_art_nr_row(row: HashMap<String, String>, _idx: usize) -> DomainResult<ArtNrCompareRow> {
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
        eigenbestand_nach_erp: parse_i64(&get(&row, "Eigenbestand nach ERP")),
        rfid_scan: parse_i64(&get(&row, "RFID-Scan")),
        differenz: parse_i64(&get(&row, "Differenz")),
        id,
    })
}

fn map_lot_id_row(row: HashMap<String, String>, file_index: usize) -> DomainResult<LotIdCompareRow> {
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
        // Placeholder; caller may rewrite if all are 0.
        // Use file order + 1 when Index column absent entirely.
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
        eigenbestand_nach_erp: presence_flag(&get(&row, "Eigenbestand nach ERP")),
        rfid_scan: presence_flag(&get(&row, "RFID-Scan")),
        ablaufdatum,
        to_do: get(&row, "To Do"),
        anmerkung: get(&row, "Anmerkung"),
        stichprobe: get(&row, "Stichprobe"),
        id,
        index,
    })
}

fn map_erp_row(row: HashMap<String, String>) -> ErpRow {
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
        eigenbestand_nach_erp: get(&row, "Eigenbestand nach ERP"),
        extra: vec![],
    }
}

fn map_rfid_row(row: HashMap<String, String>) -> RfidRow {
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

fn map_offene_posten_row(row: HashMap<String, String>) -> OffenePostenRow {
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::export::write_abgleich_xlsx;
    use pretty_assertions::assert_eq;
    use rust_xlsxwriter::Workbook;
    use tempfile::TempDir;

    fn open_position(lot: &str, offen: &str) -> OffenePostenRow {
        OffenePostenRow {
            artikelnummer: "4711".into(),
            produktname: "Schraube".into(),
            lot_id: lot.into(),
            ablaufdatum: "01.05.2027".into(),
            offen: offen.into(),
            id: format!("op-{lot}"),
        }
    }

    fn empty_compare(offene_posten: Vec<OffenePostenRow>) -> CompareResult {
        CompareResult {
            debitor: "10521".into(),
            kundenname: UNBEKANNT.into(),
            ax_bestand: vec![],
            rfid_scan: vec![],
            bestandsabgleich_artikelnummer: vec![],
            bestandsabgleich_lot_id: vec![],
            offene_posten,
        }
    }

    #[test]
    fn offene_posten_roundtrip_through_excel() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("abgleich.xlsx");
        write_abgleich_xlsx(&empty_compare(vec![open_position("L9", "2")]), &path).unwrap();

        let loaded = load_abgleich_xlsx(&path).unwrap();
        assert_eq!(loaded.offene_posten, vec![open_position("L9", "2")]);
    }

    #[test]
    fn empty_offene_posten_sheet_loads_as_empty() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("abgleich.xlsx");
        write_abgleich_xlsx(&empty_compare(vec![]), &path).unwrap();

        let loaded = load_abgleich_xlsx(&path).unwrap();
        assert!(loaded.offene_posten.is_empty());
    }

    #[test]
    fn offene_posten_sheet_without_cells_loads_as_empty() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("abgleich.xlsx");
        let mut workbook = Workbook::new();
        workbook
            .add_worksheet()
            .set_name(sheet_names::BESTANDSABGLEICH_ARTIKELNUMMER)
            .unwrap()
            .write_string(0, 0, "Artikelnummer")
            .unwrap();
        workbook
            .add_worksheet()
            .set_name(sheet_names::BESTANDSABGLEICH_LOT_ID)
            .unwrap()
            .write_string(0, 0, "LotId")
            .unwrap();
        workbook
            .add_worksheet()
            .set_name(sheet_names::OFFENE_POSTEN)
            .unwrap();
        workbook.save(&path).unwrap();

        let loaded = load_abgleich_xlsx(&path).unwrap();
        assert!(loaded.offene_posten.is_empty());
    }

    #[test]
    fn workbook_without_offene_posten_sheet_loads_as_empty() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("abgleich.xlsx");
        let mut workbook = Workbook::new();
        workbook
            .add_worksheet()
            .set_name(sheet_names::BESTANDSABGLEICH_ARTIKELNUMMER)
            .unwrap()
            .write_string(0, 0, "Artikelnummer")
            .unwrap();
        workbook
            .add_worksheet()
            .set_name(sheet_names::BESTANDSABGLEICH_LOT_ID)
            .unwrap()
            .write_string(0, 0, "LotId")
            .unwrap();
        workbook.save(&path).unwrap();

        let loaded = load_abgleich_xlsx(&path).unwrap();
        assert!(loaded.offene_posten.is_empty());
    }

    #[test]
    fn presence_flag_coerces_numeric_and_string() {
        assert_eq!(presence_flag("1"), "1");
        assert_eq!(presence_flag("1.0"), "1");
        assert_eq!(presence_flag("0"), "0");
        assert_eq!(presence_flag(""), "0");
    }

    #[test]
    fn parse_i64_from_float_string() {
        assert_eq!(parse_i64("3"), 3);
        assert_eq!(parse_i64("3.0"), 3);
        assert_eq!(parse_i64("-1"), -1);
    }
}
