# Architecture

Source of truth for **frontend** (`src/`) and **Rust backend** (`src-tauri/`) layout. Historical v4 notes: [documentation/architecture-current.md](./documentation/architecture-current.md).

---

# Frontend Architecture

Layered structure for the React/Vite frontend.

## Dependency rule

Dependencies point **inward**:

```text
screens/   → features/, core/
features/  → domains/, core/
domains/   → Tauri APIs, sibling domain utils
core/      → (nothing from features/domains)
```

| Layer | May contain | Must not contain |
|-------|-------------|------------------|
| `screens/` | Route composition | Business rules, heavy state machines |
| `features/` | React UI, feature hooks | Imports from other features (compose via screen slots) |
| `domains/` | Types, invoke adapters, pure mappers/stats | React, JSX, hooks |
| `core/` | UI primitives, theme, generic utils | Feature or domain imports |

## Tree

```text
src/
├── main.tsx
├── index.css
├── screens/                 # Thin route shells
├── features/
│   ├── home/                # Start flow UI + hooks
│   ├── editor/              # Editor UI + hooks + tables
│   ├── catalog/             # Catalog settings panel
│   ├── shell/               # Shared app chrome (topbar)
│   └── feedback/            # Updater dialog
├── domains/
│   ├── inventur/            # Snapshot types, invoke, mappers, stats, autofill
│   ├── projects/            # Project library IPC + InventurFile
│   ├── catalog/             # Reference catalog IPC
│   ├── pdf/                 # PDF export adapters
│   └── export/              # Excel/PDF download adapters (Rust bytes + save dialog)
└── core/
    ├── ui/                  # shadcn/Base UI + data-table/*
    ├── utils/               # cn, ablaufdatum
    └── theme/               # ThemeProvider
```

## Import conventions

- Prefer `@/` path alias (`@/features/…`, `@/domains/…`, `@/core/…`).
- Domain public surface: import from `@/domains/<name>` (barrel) when possible.
- Feature hooks live next to the feature under `hooks/`.
- shadcn aliases in `components.json` map `ui` → `@/core/ui`, `utils` → `@/core/utils`.

## Path mapping (old → new)

| Old | New |
|-----|-----|
| `src/lib/inventur.ts` | `src/domains/inventur/*` |
| `src/lib/projects.ts` | `src/domains/projects/*` |
| `src/lib/catalog.ts` | `src/domains/catalog/*` |
| `src/lib/pdf.ts` | `src/domains/pdf/*` |
| `src/lib/file-actions.ts` | `src/domains/export/*` |
| `src/lib/utils.ts` | `src/core/utils` |
| `src/components/ui/*` | `src/core/ui/*` |
| `src/components/home/*` | `src/features/home/*` |
| `src/components/editor/*` | `src/features/editor/*` |
| `src/components/layout/AppTopbar.tsx` | `src/features/shell/AppTopbar.tsx` |
| `src/context/ThemeContext.tsx` | `src/core/theme/ThemeContext.tsx` |

---

# Rust Backend Architecture

Tauri host + pure domain engine. Frontend IPC depends on **command string names** and **serde field names**, not Rust file paths.

## Dependency rule

```text
commands/     → domain/*  (thin IPC adapters only)
domain/inventur → parse, compare, editor, catalog
domain/editor   → export, types/normalize/error
domain/parse    → types/normalize/error
domain/compare  → types/normalize
domain/catalog  → types/normalize/error
domain/projects → editor
domain/pdf      → types/error (+ Typst assets)
```

| Layer | Role |
|-------|------|
| `commands/` | `#[tauri::command]` wrappers: open DB / app-data paths, map `DomainError` → `String` |
| `domain/` | Parse, compare, editor draft, catalog SQLite, projects store, PDF, Excel export |
| `lib.rs` | Stable crate-root re-exports for integration tests |

## Tree

```text
src-tauri/src/
├── main.rs                      # plugins + generate_handler! (flat commands::*)
├── lib.rs                       # pub mod commands/domain + public re-exports
├── commands/
│   ├── mod.rs                   # app_data_dir, open_db, domain_err + flat re-exports
│   ├── catalog.rs
│   ├── inventur.rs
│   ├── pdf.rs
│   └── projects.rs
└── domain/
    ├── types.rs / error.rs / normalize.rs / gtin.rs / inventur.rs
    ├── parse/                   # erp, rfid, excel, abgleich (+ cells/map)
    ├── compare/                 # art_nr, lot_id
    ├── editor/                  # draft, types, normalize_patch, stats, auto_*, …
    ├── catalog/                 # db/{mod,gtin_store,debitor_store}, import, types
    ├── projects/                # types, paths, io, store
    ├── pdf/                     # types, engine, dict, render
    └── export/                  # xlsx Abgleich writer
```

## Stability contract

- **Do not change** Tauri invoke names or serde DTO shapes (`EditorSnapshot`, `ProjectMeta`, `PdfExportInput`, …) without a coordinated frontend update.
- Keep domain barrels (`editor/mod.rs`, `catalog/mod.rs`, `parse/mod.rs`, `pdf/mod.rs`, `projects/mod.rs`) re-exporting the same public names.
- Keep `lib.rs` re-exports stable — integration tests import from the crate root.
- `commands/mod.rs` re-exports commands **and** Tauri `__cmd__*` / `__tauri_command_name_*` companions so `generate_handler![commands::…]` stays flat.

## Domain module notes

- **projects/** — `types` / `paths` / `io` / `store`; barrel re-exports CRUD + DTOs.
- **editor/** — session API in `draft.rs`; patch validation in `normalize_patch.rs`; `stats` / `types` split out.
- **parse/abgleich** — orchestration vs row mappers vs cell helpers.
- **catalog/db/** — directory so inherent `impl CatalogDb` can live next to GTIN/Debitor stores.
- **pdf/** — Typst engine/dict builders separate from `render_*` entrypoints.

Verify with `cd src-tauri && cargo test` after domain or commands changes.
