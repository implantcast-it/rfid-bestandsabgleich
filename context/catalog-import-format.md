# Reference catalog Excel format

Updated: 2026-11-05

Operators import **one** `.xlsx` / `.xls` via Settings (Zahnrad).

## Sheets

| Sheet | Aliases |
|-------|---------|
| `GTIN` | `Master`, `GTIN-Liste`, `GTIN Liste` |
| `DEBITOREN` | `Debitoren`, `Debitor`, `Kunden`, `Debitorenliste` |

Sheet match is case-insensitive.

## GTIN columns (current operator format)

Order does not matter (matched by header name):

| Column | Required | Notes |
|--------|----------|--------|
| `Artikelnummer` | No | Falls back to `"Unbekannt"` |
| `GTIN` | **Yes** | Empty → row skipped |
| `Kennzeichen 3` | No | Or `Kennzeichen` |
| `Produktname` | No | Falls back to `"Unbekannt"` |

## Debitoren columns (current operator format)

| Column | Maps to |
|--------|---------|
| `ID` | `debitorenkonto` |
| `Name` | `kundenname` |
| `Postanschrift` | street / address line |
| `PLZ` | postal code |
| `Ort` | city |

Legacy id/name headers still work (`Debitorenkonto` + `Kundenname`, etc.).

Import is **additive**: existing primary keys are never overwritten. Address fields are stored in SQLite and returned on `search_debitors`.
