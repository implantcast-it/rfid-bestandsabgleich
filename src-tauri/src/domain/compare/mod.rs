//! Reconciliation orchestration: ArtNr and LotId compare.
//!
//! Pure functions — no IO. Callers parse inputs first, then pass [`CompareInput`].

mod art_nr;
mod lot_id;

pub use art_nr::compare_art_nr;
pub use lot_id::compare_lot_id;

use crate::domain::types::{CompareInput, CompareResult};

/// Run the full inventur comparison over already-parsed rows.
///
/// Always produces ArtNr + LotId results. Raw ERP / RFID rows are passed through
/// for export sheets. Offene Posten are passed through as-is and never compared.
pub fn run_compare(input: CompareInput) -> CompareResult {
    let bestandsabgleich_artikelnummer = compare_art_nr(&input.erp, &input.rfid);
    let bestandsabgleich_lot_id = compare_lot_id(&input.erp, &input.rfid);

    CompareResult {
        debitor: input.debitor,
        kundenname: input.kundenname,
        ax_bestand: input.erp,
        rfid_scan: input.rfid,
        bestandsabgleich_artikelnummer,
        bestandsabgleich_lot_id,
        offene_posten: input.offene_posten,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::types::{ErpRow, OffenePostenRow, RfidRow};
    use pretty_assertions::assert_eq;

    fn sample_input() -> CompareInput {
        CompareInput {
            debitor: "10521".into(),
            kundenname: "Klinikum Test".into(),
            offene_posten: vec![],
            erp: vec![ErpRow {
                artikelnummer: "100".into(),
                produktname: "Implant".into(),
                lot_id: "L1".into(),
                kennzeichen_3: "IMP".into(),
                ablaufdatum: "1/1/2030".into(),
                debitorenkonto: "10521".into(),
                eigenbestand_nach_erp: "1".into(),
                extra: vec![],
            }],
            rfid: vec![RfidRow {
                gtin: "04048844149895".into(),
                lot_id: "L1".into(),
                kennung_1: "QM".into(),
                debitorennummer: "10521".into(),
                erfasst_um: "12:00".into(),
                artikelnummer: "100".into(),
                produktname: "Implant".into(),
                kennzeichen_3: "IMP".into(),
            }],
        }
    }

    #[test]
    fn run_compare_produces_matching_art_and_lot() {
        let result = run_compare(sample_input());
        assert_eq!(result.bestandsabgleich_lot_id.len(), 1);
        assert_eq!(result.bestandsabgleich_artikelnummer[0].differenz, 0);
        assert_eq!(result.debitor, "10521");
        assert_eq!(result.rfid_scan.len(), 1);
        assert_eq!(result.ax_bestand.len(), 1);
    }

    #[test]
    fn offene_posten_pass_through_without_affecting_compare() {
        let mut input = sample_input();
        input.offene_posten = vec![OffenePostenRow {
            artikelnummer: "200".into(),
            produktname: "Offen".into(),
            lot_id: "L9".into(),
            ablaufdatum: "01.05.2027".into(),
            offen: "3".into(),
            id: "op-1".into(),
        }];

        let result = run_compare(input);
        assert_eq!(result.offene_posten.len(), 1);
        assert_eq!(result.ax_bestand.len(), 1);
        assert_eq!(result.bestandsabgleich_lot_id.len(), 1);
        assert!(result
            .bestandsabgleich_lot_id
            .iter()
            .all(|row| row.lot_id != "L9"));
        assert_eq!(result.bestandsabgleich_artikelnummer.len(), 1);
    }
}
