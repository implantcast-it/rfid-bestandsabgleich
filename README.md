# RFID-Applikation – Bestandsabgleich v5.0.0

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
├── src/                         # Frontend (React, TypeScript)
│   ├── main.tsx                 # Routen (wouter) und Theme-Provider
│   ├── screens/                 # Dünne Routen: StartScreen, EditorScreen
│   ├── features/                # UI + Hooks (home, editor, catalog, shell, feedback)
│   ├── domains/                 # Pure TS: Types, Tauri-invoke, Mapper (kein React)
│   └── core/                    # UI-Primitives, Utils, Theme
├── src-tauri/                   # Backend (Tauri v2, Rust)
│   ├── src/
│   │   ├── main.rs              # App-Start und Registrierung der Tauri-Befehle
│   │   ├── commands/            # Dünne IPC-Adapter (catalog, inventur, pdf, projects)
│   │   ├── lib.rs               # Einstieg der Bibliothek + stabile Re-Exports
│   │   └── domain/              # Fachlogik: parse, compare, editor, export, catalog, pdf, projects
│   ├── assets/                  # PDF-Vorlagen (Typst), Schriften, Logo
│   └── tests/                   # Integrationstests
├── ARCHITECTURE.md              # Frontend- und Rust-Schichten, Dependency-Regeln
├── documentation/               # Produkt-, Architektur- und Entwicklerdokumentation
├── context/                     # Notizen für KI-Agenten, kein Produktcode
├── public/                      # Statische Frontend-Assets (Logo, Favicon)
└── .github/workflows/           # CI (Rust-Tests) und Release
```

Konfiguration liegt im Wurzelverzeichnis: `package.json`, `vite.config.ts`, `tsconfig*.json` und `components.json` (shadcn).

Konventionen im Frontend:

- Abhängigkeiten zeigen nach innen: `screens → features → domains/core` (Details: [ARCHITECTURE.md](./ARCHITECTURE.md)).
- Rust: `commands/` → `domain/` (IPC-Namen und Serde-DTOs stabil halten; siehe [ARCHITECTURE.md](./ARCHITECTURE.md#rust-backend-architecture)).
- Feature-Komponenten: Dateiname = Komponentenname in PascalCase (z. B. `LotIdTable.tsx`).
- Basis-Komponenten in `src/core/ui/` folgen den shadcn-Konventionen (Dateinamen in kebab-case).
- Imports aus `src/` nutzen den Alias `@/`, z. B. `@/core/utils`, `@/domains/inventur`.

## Screenshots

|            Start Screen             |             Editor View              |
| :---------------------------------: | :----------------------------------: |
| ![](documentation/assets/start.png) | ![](documentation/assets/editor.png) |
