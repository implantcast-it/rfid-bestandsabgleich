# RFID-Applikation – Bestandsabgleich v4.1.3

Um eine händische Inventur beim Kunden effizienter zu gestalten, wurde eine RFID-unterstützte Inventur eingeführt. Diese soll den händischen und zeitintensiven Prozess ablösen.
Dafür wurde eine Software für implantcast entwickelt, welche die erfassten Daten des RFID-Geräts mit unserem Bestand abgleicht.

Damit dieser Abgleich stattfinden kann, müssen vom durchführenden Mitarbeiter folgende Dateien vorbereitet / angefordert werden:

- Ein Master-Excel (gleich für alle Kunden): GTIN-Zuordnung für RFID-Scans — in der Neuauflage einmalig in die App übernommen; Ergebnis-Excel erzeugt das Programm selbst
- Ein tagesaktueller Abzug aus unserem ERP-System aller Produkte die laut unserer Daten beim Kunden liegen sollten (Excel)
- Das Programm für den Bestandsabgleich

## Dokumentation

Ausführliche Dokumentation: [documentation/README.md](./documentation/README.md)

Für einen geplanten Rewrite (UI, Implementierung, Tests, Performance) zuerst lesen:

- [Product Intent](./documentation/product-intent.md)
- [User Flows](./documentation/user-flows.md)
- [Data Model & Business Rules](./documentation/data-model-and-rules.md)
- [Feature Parity](./documentation/feature-parity.md)

## Tech Stack

Das Programm wurde mit folgenden Tools & Frameworks geschrieben:

**Frontend:** React 19, TypeScript, Vite, TailwindCSS v4, shadcn / Base UI, TanStack Table, wouter, sonner

**Backend:** Tauri v2 mit Rust (Fachlogik in `src-tauri/src/domain`: Excel-Import und -Export, Abgleich, lokaler SQLite-Katalog, PDF-Erzeugung mit Typst)

**Programmiersprachen:** TypeScript, Rust

## Projektstruktur

```text
rfid-bestandsabgleich/
├── src/                    # Frontend (React, TypeScript)
│   ├── main.tsx            # Routen (wouter) und Theme-Provider
│   ├── screens/            # Seiten: StartScreen (Inventur) und EditorScreen (Abgleich)
│   ├── components/
│   │   ├── home/           # Bausteine der Startseite
│   │   ├── editor/         # Bausteine des Editors, inkl. tables/ (Tabellen)
│   │   ├── layout/         # App-Topbar
│   │   ├── feedback/       # Fehler- und Erfolgsmeldungen, Updater-Dialog
│   │   └── ui/             # Basis-Komponenten (shadcn / Base UI)
│   ├── context/            # React-Context (Theme)
│   └── lib/                # Logik ohne eigene Komponenten: Tauri-Aufrufe, Excel/PDF, Suche
├── src-tauri/              # Backend (Tauri v2, Rust)
│   ├── src/
│   │   ├── main.rs         # App-Start und Registrierung der Tauri-Befehle
│   │   ├── commands.rs     # Tauri-Befehle (Schnittstelle zum Frontend)
│   │   ├── lib.rs          # Einstieg der Bibliothek
│   │   └── domain/         # Fachlogik: parse, compare, editor, export, catalog, pdf, projects
│   ├── assets/             # PDF-Vorlagen (Typst), Schriften, Logo
│   └── tests/              # Integrationstests
├── documentation/          # Produkt-, Architektur- und Entwicklerdokumentation (Einstieg: documentation/README.md)
├── context/                # Notizen für KI-Agenten, kein Produktcode
├── public/                 # Statische Frontend-Assets (Logo, Favicon)
└── .github/workflows/      # CI (Rust-Tests) und Release
```

Konfiguration liegt im Wurzelverzeichnis: `package.json`, `vite.config.ts`, `tsconfig*.json` und `components.json` (shadcn).

Konventionen im Frontend:

- Feature-Komponenten: Dateiname = Komponentenname in PascalCase (z. B. `LotIdTable.tsx`).
- Basis-Komponenten in `src/components/ui/` folgen den shadcn-Konventionen (Dateinamen in kebab-case).
- Imports aus `src/` nutzen den Alias `@/`, z. B. `@/lib/utils`.

## Screenshots

|            Start Screen             |             Editor View              |
| :---------------------------------: | :----------------------------------: |
| ![](documentation/assets/start.png) | ![](documentation/assets/editor.png) |
