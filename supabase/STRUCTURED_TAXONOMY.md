# Structured Service Taxonomy

## Rules

- Codes are permanent analytics identifiers. Never rename a code after release.
- Display names may change.
- Old values become inactive; they are not deleted.
- Vehicle type, make, model, one service category, and one failure category are mandatory.
- A record may contain multiple service and failure categories.
- `Other` requires typed make/model values and uses the `other` category code.
- Notes explain unusual work. Notes never replace structured selections.
- Master changes ship through reviewed migrations until an admin taxonomy tool exists.

## Stored snapshot

Each service record stores vehicle type, known make/model codes or explicit other values,
model year, odometer, taxonomy version, and notes. Join tables store all selected service
and failure codes. This preserves historical reporting when labels change.

## Data-quality checks

- Reject missing taxonomy selections.
- Reject mismatched vehicle type, make, and model.
- Reject impossible model year and odometer values.
- Report `other` and `unknown` rates by garage.
- Review common free-text values monthly and promote them into master codes.
