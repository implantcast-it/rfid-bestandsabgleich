# Frontend Architecture

Layered structure for the React/Vite frontend. Rust domain code stays under `src-tauri/src/domain/` (unchanged by this layout).

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
│   └── export/              # Excel download / SheetJS helpers
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

Historical v4 notes: [documentation/architecture-current.md](./documentation/architecture-current.md) (superseded for frontend layout).
