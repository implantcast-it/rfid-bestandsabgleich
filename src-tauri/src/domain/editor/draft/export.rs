use std::path::Path;

use super::InventurDraft;
use crate::domain::error::DomainResult;
use crate::domain::export::{write_abgleich_xlsx, write_abgleich_xlsx_bytes};
use crate::domain::types::CompareResult;

impl InventurDraft {
    /// Clean `CompareResult` for Excel: LotId as-is, ArtNr freshly aggregated.
    ///
    /// No ephemeral fields (`edited_ids` / dirty) are included.
    pub fn to_export_result(&self) -> CompareResult {
        CompareResult {
            debitor: self.debitor.clone(),
            kundenname: self.kundenname.clone(),
            ax_bestand: self.ax_bestand.clone(),
            rfid_scan: self.rfid_scan.clone(),
            bestandsabgleich_artikelnummer: self.art_nr_rows(),
            bestandsabgleich_lot_id: self.lot_id_rows.clone(),
            offene_posten: self.offene_posten.clone(),
        }
    }

    /// Rebuild ArtNr from lots and write the scratch Abgleich workbook.
    pub fn write_xlsx(&self, path: &Path) -> DomainResult<()> {
        write_abgleich_xlsx(&self.to_export_result(), path)
    }

    /// Same workbook as [`Self::write_xlsx`], as raw `.xlsx` bytes for the UI save dialog.
    pub fn write_xlsx_bytes(&self) -> DomainResult<Vec<u8>> {
        write_abgleich_xlsx_bytes(&self.to_export_result())
    }
}

#[cfg(test)]
mod tests {
    use super::super::fixtures::{lot, sample_compare};
    use super::super::InventurDraft;
    use crate::domain::editor::aggregate::aggregate_art_nr_from_lot_id;
    use crate::domain::editor::types::LotIdPatch;
    use crate::domain::parse::load_abgleich_xlsx;
    use pretty_assertions::assert_eq;
    use tempfile::TempDir;

    #[test]
    fn to_export_result_art_nr_matches_aggregate() {
        let lots = vec![
            lot("100", "L1", "1", "0", "a", 1),
            lot("100", "L2", "1", "1", "b", 2),
        ];
        let mut draft = InventurDraft::from_compare(sample_compare(lots, vec![]));
        draft
            .apply_patches(&[LotIdPatch {
                id: "a".into(),
                rfid_scan: Some("1".into()),
                to_do: Some("NUR berechnen".into()),
                ..Default::default()
            }])
            .unwrap();

        let exported = draft.to_export_result();
        assert_eq!(
            exported.bestandsabgleich_artikelnummer,
            aggregate_art_nr_from_lot_id(&exported.bestandsabgleich_lot_id)
        );
        assert_eq!(exported.bestandsabgleich_artikelnummer[0].differenz, 0);
        assert_eq!(exported.bestandsabgleich_lot_id[0].to_do, "NUR berechnen");
    }

    #[test]
    fn write_xlsx_roundtrip_preserves_lot_edits() {
        let lots = vec![lot("100", "L1", "1", "0", "a", 1)];
        let mut draft = InventurDraft::from_compare(sample_compare(lots, vec![]));
        draft
            .apply_patches(&[LotIdPatch {
                id: "a".into(),
                rfid_scan: Some("1".into()),
                to_do: Some("NUR berechnen".into()),
                anmerkung: Some("AWS".into()),
                stichprobe: Some("X".into()),
            }])
            .unwrap();

        let dir = TempDir::new().unwrap();
        let path = dir.path().join("abgleich.xlsx");
        draft.write_xlsx(&path).unwrap();

        let loaded = load_abgleich_xlsx(&path).unwrap();
        assert_eq!(loaded.bestandsabgleich_lot_id.len(), 1);
        let row = &loaded.bestandsabgleich_lot_id[0];
        assert_eq!(row.rfid_scan, "1");
        assert_eq!(row.to_do, "NUR berechnen");
        assert_eq!(row.anmerkung, "AWS");
        assert_eq!(row.stichprobe, "X");
        let reloaded = InventurDraft::from_compare(loaded);
        assert_eq!(reloaded.art_nr_rows()[0].differenz, 0);
    }
}
