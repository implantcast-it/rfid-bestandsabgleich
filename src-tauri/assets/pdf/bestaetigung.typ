// Blank Bestätigungsformular (landscape A4) for printing form stacks.
// No autofill — Kundennummer, Ort, Datum and signatures stay empty.

#let brand = rgb("#006860")
#let muted = rgb("#555555")
#let rule = 0.6pt + brand

#set text(font: "DejaVu Sans", size: 8pt, fill: rgb("#111111"))
#set par(leading: 0.4em)

#set page(
  paper: "a4",
  flipped: true,
  margin: (top: 10mm, bottom: 14mm, left: 8mm, right: 8mm),
  header: none,
  footer: context {
    align(center, text(size: 7.5pt, fill: muted)[Bestätigung der Inventur])
  },
)

#grid(
  columns: (1fr, 16mm),
  column-gutter: 3mm,
  align: (left + top, right + top),
  [
    #text(size: 14pt, weight: "bold")[Bestätigung der Inventur]
  ],
  image("ic-logo.png", width: 14mm),
)

#v(1.5mm)
#line(length: 100%, stroke: rule)
#v(8mm)

#let field(label, height: 8mm) = {
  block(width: 100%)[
    #box(
      width: 100%,
      height: height,
      stroke: (bottom: 0.6pt + rgb("#666666")),
      inset: (bottom: 1.5pt),
      [],
    )
    #v(1mm)
    #text(size: 7.5pt, fill: muted)[#label]
  ]
}

#grid(
  columns: (1fr, 1fr, auto, 0.7fr),
  column-gutter: 4mm,
  align: bottom,
  field[Kundennummer],
  field[Ort],
  text(size: 9pt)[, den],
  field[Datum],
)

#v(14mm)

#grid(
  columns: (1fr, 1fr),
  column-gutter: 10mm,
  field(height: 22mm)[Unterschrift Außendienstmitarbeiter],
  field(height: 22mm)[Unterschrift Kunde & Stempel],
)

#v(1fr)

#text(size: 8pt)[
  #text(weight: "bold")[implantcast GmbH]\
  Lüneburger Schanze 26\
  D-21614 Buxtehude
]
