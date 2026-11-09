//! Typst → PDF bytes for Bestandsabgleich LotId exports and blank Bestätigung forms.

use crate::domain::error::{DomainError, DomainResult};
use crate::domain::pdf::dict::{input_to_dict, resolve_generated_at};
use crate::domain::pdf::engine::{engine, format_typst_error, pdf_bytes_from_doc};
use crate::domain::pdf::types::{PdfExportInput, PdfTotals};

/// Render inventur LotId table pages to PDF bytes (`%PDF`…).
///
/// Footers use German `Seite i von n`. The blank Bestätigung form is a separate
/// download via [`render_bestaetigung_pdf`].
pub fn render_abgleich_pdf(input: &PdfExportInput) -> DomainResult<Vec<u8>> {
    let generated_at = resolve_generated_at(input);
    let totals = PdfTotals::from_lots(&input.lots);
    let datum = generated_at.format("%d.%m.%Y").to_string();
    let uhrzeit = generated_at.format("%H:%M:%S").to_string();
    let dict = input_to_dict(input, totals, &datum, &uhrzeit);

    let warned = engine().compile_with_input::<_, _, typst_layout::PagedDocument>(
        "abgleich.typ",
        dict,
    );
    let doc = warned
        .output
        .map_err(|e| DomainError::Pdf(format_typst_error(e)))?;

    pdf_bytes_from_doc(&doc)
}

/// Render a blank landscape Bestätigungsformular (no autofill) for printing stacks.
pub fn render_bestaetigung_pdf() -> DomainResult<Vec<u8>> {
    let warned = engine().compile::<_, typst_layout::PagedDocument>("bestaetigung.typ");
    let doc = warned
        .output
        .map_err(|e| DomainError::Pdf(format_typst_error(e)))?;

    pdf_bytes_from_doc(&doc)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::pdf::dict::{input_to_dict, lot_to_value};
    use crate::domain::pdf::engine::engine;
    use crate::domain::types::{LotIdCompareRow, OffenePostenRow};
    use typst::foundations::Value;

    fn sample_lot(index: u32, erp: &str, rfid: &str) -> LotIdCompareRow {
        LotIdCompareRow {
            artikelnummer: format!("REF-{index}"),
            produktname: format!("Produkt ÄÖÜ {index}"),
            kennzeichen_3: "K".into(),
            lot_id: format!("LOT/{index}"),
            eigenbestand_nach_erp: erp.into(),
            rfid_scan: rfid.into(),
            ablaufdatum: "12.2027".into(),
            to_do: "Prüfen".into(),
            anmerkung: "ok".into(),
            stichprobe: "".into(),
            id: format!("id-{index}"),
            index,
        }
    }

    #[test]
    fn sum_presence_matches_js_number_coercion() {
        let vals = ["1", "0", "1", "2", "x", ""];
        assert_eq!(crate::domain::pdf::types::sum_presence(vals.iter().copied()), 4);
    }

    #[test]
    fn totals_abweichung_is_ist_minus_soll() {
        let lots = vec![
            sample_lot(1, "1", "1"),
            sample_lot(2, "1", "0"),
            sample_lot(3, "0", "1"),
        ];
        let t = PdfTotals::from_lots(&lots);
        assert_eq!(t.anzahl, 3);
        assert_eq!(t.soll, 2);
        assert_eq!(t.ist, 2);
        assert_eq!(t.abweichung, 0);
    }

    #[test]
    fn empty_lots_still_produce_pdf() {
        let input = PdfExportInput {
            debitor: "45120".into(),
            kundenname: "Testklinik".into(),
            lots: vec![],
            offene_posten: vec![],
            generated_at: Some("2026-11-05T10:00:00+01:00".into()),
        };
        let bytes = render_abgleich_pdf(&input).expect("pdf");
        assert!(bytes.starts_with(b"%PDF-"));
        assert!(bytes.len() > 500);
    }

    #[test]
    fn fixture_lots_render_non_empty_pdf() {
        let lots: Vec<_> = (1..=5).map(|i| sample_lot(i, "1", "1")).collect();
        let input = PdfExportInput {
            debitor: "33801".into(),
            kundenname: String::new(),
            lots,
            offene_posten: vec![],
            generated_at: Some("2026-11-05T10:00:00+01:00".into()),
        };
        let bytes = render_abgleich_pdf(&input).expect("pdf");
        assert!(bytes.starts_with(b"%PDF-"));
        assert!(bytes.len() > 1000);
    }

    #[test]
    fn multipage_inventur_renders() {
        let lots: Vec<_> = (1..=80)
            .map(|i| {
                let erp = "1";
                let rfid = if i % 7 == 0 { "0" } else { "1" };
                sample_lot(i, erp, rfid)
            })
            .collect();
        let input = PdfExportInput {
            debitor: "45120".into(),
            kundenname: "Klinik Nord".into(),
            lots,
            offene_posten: vec![],
            generated_at: Some("2026-11-05T10:00:00+01:00".into()),
        };
        let bytes = render_abgleich_pdf(&input).expect("pdf");
        assert!(bytes.starts_with(b"%PDF-"));
        assert!(bytes.len() > 8000);
    }

    #[test]
    fn blank_bestaetigung_renders() {
        let bytes = render_bestaetigung_pdf().expect("pdf");
        assert!(bytes.starts_with(b"%PDF-"));
        assert!(bytes.len() > 500);
    }

    fn sample_open_position(index: u32) -> OffenePostenRow {
        OffenePostenRow {
            artikelnummer: format!("OFF-{index}"),
            produktname: format!("Offen ÄÖÜ {index}"),
            lot_id: format!("OPEN/{index}"),
            ablaufdatum: "01.05.2027".into(),
            offen: (index % 3 + 1).to_string(),
            id: format!("open-{index}"),
        }
    }

    #[test]
    fn open_positions_render_as_separate_section() {
        let input = PdfExportInput {
            debitor: "45120".into(),
            kundenname: "Klinik Nord".into(),
            lots: vec![sample_lot(1, "1", "1")],
            offene_posten: vec![sample_open_position(1), sample_open_position(2)],
            generated_at: Some("2026-11-06T11:00:00+01:00".into()),
        };
        let bytes = render_abgleich_pdf(&input).expect("pdf");
        assert!(bytes.starts_with(b"%PDF-"));
        assert!(bytes.len() > 1000);
    }

    #[test]
    fn open_positions_are_not_counted_in_totals() {
        let lots = vec![sample_lot(1, "1", "1")];
        let totals = PdfTotals::from_lots(&lots);
        let input = PdfExportInput {
            debitor: "45120".into(),
            kundenname: String::new(),
            lots,
            offene_posten: vec![sample_open_position(1)],
            generated_at: None,
        };
        let dict = input_to_dict(&input, totals, "06.11.2026", "10:00:00");
        assert_eq!(dict.get("anzahl").ok(), Some(&Value::Int(1)));
        assert_eq!(dict.get("soll").ok(), Some(&Value::Int(1)));
        let Some(Value::Array(open)) = dict.get("offene_posten").ok() else {
            panic!("expected offene_posten array");
        };
        assert_eq!(open.len(), 1);
    }

    fn compiled_text(input: &PdfExportInput) -> String {
        let totals = PdfTotals::from_lots(&input.lots);
        let dict = input_to_dict(input, totals, "06.11.2026", "10:00:00");
        let warned =
            engine().compile_with_input::<_, _, typst_layout::PagedDocument>("abgleich.typ", dict);
        let doc = warned.output.expect("typst compile");
        let mut text = String::new();
        for page in doc.pages() {
            collect_text(&page.frame, &mut text);
        }
        text
    }

    fn collect_text(frame: &typst::layout::Frame, out: &mut String) {
        for (_, item) in frame.items() {
            match item {
                typst::layout::FrameItem::Text(text) => out.push_str(text.text.as_str()),
                typst::layout::FrameItem::Group(group) => collect_text(&group.frame, out),
                _ => {}
            }
        }
    }

    #[test]
    fn open_positions_section_lists_rows() {
        let input = PdfExportInput {
            debitor: "45120".into(),
            kundenname: "Klinik Nord".into(),
            lots: vec![sample_lot(1, "1", "1")],
            offene_posten: vec![sample_open_position(1), sample_open_position(2)],
            generated_at: None,
        };
        let text = compiled_text(&input);
        assert!(text.contains("Offene Posten"));
        assert!(text.contains("Offen"));
        assert!(text.contains("OFF-1"));
        assert!(text.contains("OPEN/2"));
    }

    #[test]
    fn no_open_positions_means_no_section() {
        let input = PdfExportInput {
            debitor: "45120".into(),
            kundenname: "Klinik Nord".into(),
            lots: vec![sample_lot(1, "1", "1")],
            offene_posten: vec![],
            generated_at: None,
        };
        assert!(!compiled_text(&input).contains("Offene Posten"));
    }

    #[test]
    fn input_without_offene_posten_key_deserializes_empty() {
        let input: PdfExportInput =
            serde_json::from_str(r#"{"debitor":"45120","lots":[]}"#).expect("input");
        assert!(input.offene_posten.is_empty());
    }

    #[test]
    fn mismatch_flag_in_dict() {
        let lot = sample_lot(1, "1", "0");
        let value = lot_to_value(&lot);
        let Value::Dict(dict) = value else {
            panic!("expected dict");
        };
        assert_eq!(dict.get("mismatch").ok(), Some(&Value::Bool(true)));
    }

    #[test]
    fn write_visual_fixture_pdf() {
        let lots: Vec<_> = (1..=45)
            .map(|i| {
                let rfid = if i % 5 == 0 { "0" } else { "1" };
                sample_lot(i, "1", rfid)
            })
            .collect();
        let input = PdfExportInput {
            debitor: "45120".into(),
            kundenname: "Klinik Nord".into(),
            lots,
            offene_posten: (1..=4).map(sample_open_position).collect(),
            generated_at: Some("2026-11-06T11:00:00+01:00".into()),
        };
        let target = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("target");
        std::fs::create_dir_all(&target).ok();

        let abgleich = render_abgleich_pdf(&input).expect("abgleich pdf");
        std::fs::write(target.join("abgleich-fixture.pdf"), &abgleich).expect("write abgleich");

        let form = render_bestaetigung_pdf().expect("bestaetigung pdf");
        std::fs::write(target.join("bestaetigung-fixture.pdf"), &form).expect("write form");
    }
}
