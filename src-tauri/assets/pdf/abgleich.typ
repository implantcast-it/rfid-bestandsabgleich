// Bestandsabgleich inventur PDF (landscape A4, LotId table only).
// Blank Bestätigung is a separate download (`bestaetigung.typ`).
// Data arrives via `sys.inputs` from Rust (`typst-as-lib`).

#import sys: inputs

#let brand = rgb("#006860")
#let brand-dark = rgb("#004d47")
#let mismatch-fill = rgb("#fff4e5")
#let zebra-fill = rgb("#f7f7f7")
#let muted = rgb("#555555")
#let rule = 0.6pt + brand

#let debitor = inputs.debitor
#let kundenname = inputs.kundenname
#let has-kundenname = inputs.has_kundenname
#let datum = inputs.datum
#let uhrzeit = inputs.uhrzeit
#let anzahl = inputs.anzahl
#let soll = inputs.soll
#let ist = inputs.ist
#let abweichung = inputs.abweichung
#let lots = inputs.lots

#let client-line = if has-kundenname {
  debitor + " · " + kundenname
} else {
  debitor
}

#set text(font: "DejaVu Sans", size: 8pt, fill: rgb("#111111"))
#set par(leading: 0.4em)

#set page(
  paper: "a4",
  flipped: true,
  margin: (top: 10mm, bottom: 14mm, left: 8mm, right: 8mm),
  header: none,
  footer: context {
    let n = counter(page).get().first()
    let total = counter(page).final().first()
    align(center, text(size: 7.5pt, fill: muted)[
      Bestandsabgleich · #client-line
      #h(3mm)·#h(3mm)
      Datum #datum
      #h(3mm)·#h(3mm)
      Seite #n von #total
    ])
  },
)

// ─── Page 1 inventur header ─────────────────────────────────────────────────

#grid(
  columns: (1fr, 16mm),
  column-gutter: 3mm,
  align: (left + top, right + top),
  [
    #text(size: 14pt, weight: "bold")[Bestandsabgleich · #debitor]
    #if has-kundenname [
      #v(0.6mm)
      #text(size: 8pt, fill: muted)[#kundenname · Debitorenkonto #debitor]
    ]
  ],
  image("ic-logo.png", width: 14mm),
)

#v(1.5mm)
#line(length: 100%, stroke: rule)
#v(2mm)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 6mm,
  row-gutter: 1.2mm,
  [#text(fill: muted)[Datum:] #text(weight: "bold")[#datum]],
  [#text(fill: muted)[Anzahl Positionen:] #text(weight: "bold")[#anzahl]],
  [#text(fill: muted)[Uhrzeit:] #text(weight: "bold")[#uhrzeit]],
  [#text(fill: muted)[Gesamtbestand SOLL:] #text(weight: "bold")[#soll]],
  [#text(fill: muted)[Debitorenkonto:] #text(weight: "bold")[#debitor]],
  [#text(fill: muted)[Gesamtbestand IST:] #text(weight: "bold")[#ist]],
  [
    #text(fill: muted)[Außendienstmitarbeiter:]
    #box(width: 42mm, stroke: (bottom: 0.5pt + rgb("#888888")), inset: (bottom: 1pt))[]
  ],
  [
    #text(fill: muted)[Abweichung:]
    #text(
      weight: "bold",
      fill: if abweichung != 0 { rgb("#9a3412") } else { rgb("#111111") },
    )[#abweichung]
  ],
)

#v(3mm)

// ─── LotId table ────────────────────────────────────────────────────────────

#let row-fill(i, mismatch) = {
  if mismatch { mismatch-fill }
  else if calc.rem(i, 2) == 1 { zebra-fill }
  else { white }
}

#let header-cell(body) = table.cell(
  fill: brand,
  stroke: 0.3pt + brand-dark,
  inset: (x: 1.4pt, y: 2pt),
  text(size: 7pt, weight: "bold", fill: white, body),
)

#let body-cell(fill, body, align: left) = table.cell(
  fill: fill,
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 1.4pt, y: 1.6pt),
  align: align,
  text(size: 6.5pt, body),
)

#table(
  columns: (5.5%, 5%, 8%, 18%, 10%, 6.5%, 5.5%, 5.5%, 12%, 17%, 5%),
  align: (right, left, left, left, left, left, right, right, left, left, right),
  table.header(
    header-cell[Index],
    header-cell[Kennz.],
    header-cell[REF],
    header-cell[Produkt],
    header-cell[LotId],
    header-cell[Verf.],
    header-cell[ERP],
    header-cell[RFID],
    header-cell[To Do],
    header-cell[Anmerkung],
    header-cell[Stich.],
  ),
  ..for (i, lot) in lots.enumerate() {
    let f = row-fill(i, lot.mismatch)
    (
      body-cell(f, align: right)[#lot.index],
      body-cell(f)[#lot.kennz],
      body-cell(f)[#lot.artikel],
      body-cell(f)[#lot.produkt],
      body-cell(f)[#lot.lot_id],
      body-cell(f)[#lot.verfall],
      body-cell(f, align: right)[#text(weight: if lot.mismatch { "bold" } else { "regular" })[#lot.erp]],
      body-cell(f, align: right)[#text(weight: if lot.mismatch { "bold" } else { "regular" })[#lot.rfid]],
      body-cell(f)[#lot.todo],
      body-cell(f)[#lot.anmerkung],
      body-cell(f, align: right)[#lot.stich],
    )
  },
)

// ─── Offene Posten (outside the Abgleich; never part of the totals) ─────────

#let offene-posten = inputs.offene_posten

#if offene-posten.len() > 0 [
  #block(breakable: false)[
    #v(4mm)
    #text(size: 9pt, weight: "bold", fill: brand-dark)[Offene Posten]
    #v(0.6mm)
  ]
  #block(width: 75%)[
    #table(
      columns: (20%, 36%, 22%, 12%, 10%),
      align: (left, left, left, left, right),
      table.header(
        header-cell[Artikelnummer],
        header-cell[Produkt],
        header-cell[LotId],
        header-cell[MHD],
        header-cell[Offen],
      ),
      ..for lot in offene-posten {
        (
          body-cell(white)[#lot.artikel],
          body-cell(white)[#lot.produkt],
          body-cell(white)[#lot.lot_id],
          body-cell(white)[#lot.verfall],
          body-cell(white, align: right)[#lot.offen],
        )
      },
    )
  ]
]
