interface PageConfig {
  title: string
  hasHeaderButtons: boolean
}

interface PageConfigMap {
  [key: string]: PageConfig
}

export const editorPageConfig: PageConfigMap = {
  erp: { title: "ERP Bestände", hasHeaderButtons: false },
  offenePosten: { title: "Offene Posten", hasHeaderButtons: false },
  rfid: { title: "RFID Scan", hasHeaderButtons: false },
  lotId: { title: "Abgleich nach LotId", hasHeaderButtons: true },
  artikelNr: {
    title: "Abgleich nach Artikelnummer",
    hasHeaderButtons: false,
  },
}
