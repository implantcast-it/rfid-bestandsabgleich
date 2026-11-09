//! Embedded Typst engine singleton and PDF byte extraction.

use std::sync::OnceLock;

use typst_as_lib::{TypstEngine, TypstTemplateCollection};

use crate::domain::error::{DomainError, DomainResult};

const ABGLEICH_TEMPLATE: &str = include_str!("../../../assets/pdf/abgleich.typ");
const BESTAETIGUNG_TEMPLATE: &str = include_str!("../../../assets/pdf/bestaetigung.typ");
const FONT_REGULAR: &[u8] = include_bytes!("../../../assets/fonts/DejaVuSans.ttf");
const FONT_BOLD: &[u8] = include_bytes!("../../../assets/fonts/DejaVuSans-Bold.ttf");
const LOGO_PNG: &[u8] = include_bytes!("../../../assets/images/ic-logo.png");

pub(crate) fn engine() -> &'static TypstEngine<TypstTemplateCollection> {
    static ENGINE: OnceLock<TypstEngine<TypstTemplateCollection>> = OnceLock::new();
    ENGINE.get_or_init(|| {
        TypstEngine::builder()
            .fonts([FONT_REGULAR, FONT_BOLD])
            .with_static_source_file_resolver([
                ("abgleich.typ", ABGLEICH_TEMPLATE),
                ("bestaetigung.typ", BESTAETIGUNG_TEMPLATE),
            ])
            .with_static_file_resolver([("ic-logo.png", LOGO_PNG)])
            .build()
    })
}

pub(crate) fn format_typst_error(err: typst_as_lib::TypstAsLibError) -> String {
    match err {
        typst_as_lib::TypstAsLibError::TypstSource(diags) => {
            let messages: Vec<String> = diags
                .iter()
                .map(|d| d.message.as_str().to_string())
                .collect();
            if messages.is_empty() {
                "Typst-Quellfehler".into()
            } else {
                messages.join("; ")
            }
        }
        other => other.to_string(),
    }
}

pub(crate) fn pdf_bytes_from_doc(doc: &typst_layout::PagedDocument) -> DomainResult<Vec<u8>> {
    let pdf = typst_pdf::pdf(doc, &typst_pdf::PdfOptions::default())
        .map_err(|e| DomainError::Pdf(format!("PDF-Export fehlgeschlagen: {e:?}")))?;

    if pdf.len() < 5 || &pdf[0..5] != b"%PDF-" {
        return Err(DomainError::Pdf(
            "ungültige PDF-Ausgabe (Magic-Bytes fehlen)".into(),
        ));
    }

    Ok(pdf)
}
