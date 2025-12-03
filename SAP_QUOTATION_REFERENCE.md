# SAP Quotation Reference (R/3 & ECC6)

Actionable guide for quotation-specific data and transactions. Use alongside `SAP_DATA_COLLECTION.md` when preparing context for code generation.

## Core Transactions
- `VA21` / `VA22` / `VA23`: Create / Change / Display quotation (program `SAPMV45A`, screens 101–103).
- `VA25` (recommended): List quotations with full filtering; use this instead of `VA25N` (deprecated/portal-focused).
- `VA01` with reference: Create sales order from a quotation.
- `VV11` / `NACE (V1)`: Maintain quotation output (AN00), dispatch time, medium, partner.
- `SE38 -> SDVBUK00`: Repair quotation status/doc flow if inconsistent.

## VA25 vs VA25N (List of Quotations)
- Use **VA25**: Optimized report with validity/date/status filters and layout variants.
- Avoid **VA25N**: Legacy “optimized/portal” flavor; missing entries in some releases and deprecated by SAP.

## Data to Collect for Quotations
Add these to `sap-config/` alongside table/custom field exports:
- **Tables (structures via `DDIF_FIELDINFO_GET`)**: `VBAK` (header), `VBAP` (items), `VBUK` (status), `VBFA` (document flow samples), `TVAK` (document type config).
- **Custom fields**: Any `ZZ*`/`YY*` appends on `VBAK`/`VBAP`; include data element/domain info.
- **BAPIs/FM interfaces**: `BAPI_QUOTATION_CREATEFROMDATA2` (or legacy), `BAPI_QUOTATION_GETDETAIL`; note EXTENSIONIN usage for custom fields.
- **Outputs**: Current output type (e.g., AN00), medium (print/email), partner functions, form name/program.
- **Workflow (if used)**: BAdI `BADI_SD_DOCUMENT_CHECK` implementation details, status profile (BS02), approval rules/thresholds.
- **Validity rules**: How `ANGDT/BNDDT` are enforced; any copy-control routines blocking expired quotes.

## Key Fields (Quotes)
- Header (`VBAK`): `VBELN`, `VBTYP='B'`, `AUART` (type), `ANGDT`/`BNDDT` (validity), `NETWR`/`WAERK`, partners.
- Items (`VBAP`): `POSNR`, `MATNR`, `KWMENG`, `PSTYV`, `ABSTA` (rejection).
- Status (`VBUK`/`VBUP`): Completion/blocking flags.
- Flow (`VBFA`): `VBELV`/`VBTYP_V` (predecessor), `VBELN`/`VBTYP_N` (successor), `POSNV`/`POSNN`.

## BAPI Notes
- `BAPI_QUOTATION_CREATEFROMDATA2`:
  - Populate header/items/schedules/partners; call `BAPI_TRANSACTION_COMMIT`.
  - Use `EXTENSIONIN` for custom fields appended to `VBAK`/`VBAP`.
  - Does **not** automatically build inquiry→quotation document flow; use VA21/BDC if that linkage is required.

## Outputs (Email/Print)
- Output type typically **AN00**. Configure in `NACE (V1)`:
  - Dispatch time “4 - Send immediately” to auto-send on save.
  - Medium `7` (email) or `1` (print); assign partner function (e.g., SB/BP).
  - Maintain conditions in `VV11`.

## Workflow / Approvals (if present)
- Trigger often via `BADI_SD_DOCUMENT_CHECK` on save (VA21/VA22).
- User status profile (BS02) sets steps like Open → For Approval → Approved/Rejected.
- Record thresholds/approver logic used to decide if workflow runs.

## Validity & Copy Control
- `ANGDT` / `BNDDT` control whether a quotation can be referenced in `VA01`; expired quotes are rejected by copy-control routines.
- `VTAA` (copy control) and VOFM routines may skip rejected items (`ABSTA`) or expired quotations—note any custom routines.

## Quick Checks Before Generation
- VA25 returns expected quotes; VA25N not in use.
- `VBAK`/`VBAP` structures captured with lengths/decimals; custom fields listed.
- BAPI interfaces documented; EXTENSIONIN mapping for custom fields captured.
- Output type AN00 (or custom) and dispatch settings recorded.
- Workflow/approval hooks (if any) and status profile noted.

## Landscape Validation (adapt to your system)
- Outputs: In `NACE (V1)`, confirm the active quotation output type (AN00 or customer-specific), dispatch time, medium, partner function, and form program. If a different type is used, note it here.
- Partners: Generator templates use partner roles `AG` (sold-to) and `WE` (ship-to). If your landscape uses different roles (e.g., `SP`/`BP`), document them for mapping.
- Workflow: If approvals exist, capture thresholds/approver rules and the BAdI implementation (commonly `BADI_SD_DOCUMENT_CHECK`) plus the status profile (BS02) bound to the quotation type.
- Copy control: In `VTAA` (QT→OR), verify any routines that block expired or rejected items; note custom VOFM routines.
- Validity: Record default validity periods for your quotation types (AUART in TVAK) and any auto-expiry logic.

## Output determination (quotation)
- Typical standard: output type **AN00** for quotations; medium `7` (email) or `1` (print); dispatch time `4` (send immediately) or `3` (collect). Validate your actual type and form program.
- Other common types: **AF00** (inquiry), **BA00** (order confirmation). If your quotation uses a custom type, document it here.

## Partner roles (quotations)
- Common roles: `AG` (sold-to), `WE` (ship-to), `BP` (bill-to), `SP` (payer/delivery), `RE` (contact).
- Align partner roles used in your landscape with the generator’s defaults (`AG`/`WE`) or update mapping before generation.

## Copy control and validity
- Standard routines: validity checks and rejection handling often live in VOFM routines (e.g., `001` for validity date, `301` for rejected items) in `VTAA` (QT→OR).
- Expired or rejected items may be blocked from copying; note any custom routines or grace-period logic.

## Workflow patterns (if applicable)
- Typical setup: BAdI `BADI_SD_DOCUMENT_CHECK` triggers approval based on thresholds (e.g., Level 1 ≤ X, Level 2 > X) and a status profile (BS02) like Open → Pending → Approved/Rejected.
- Capture thresholds, approver rules, and the bound status profile for your quotation type.

## VA25N deprecation
- VA25N is deprecated (SAP Note 1700237 and related). Use **VA25** for quotation lists; migrate any VA25N usage.

## BAPI_QUOTATION_CREATEFROMDATA2 pitfalls
- Does not build inquiry→quotation document flow automatically; use VA21/BDC if the link is required.
- `EXTENSIONIN` requires exact structure names (e.g., `VBAKZZ_*`, `VBAPZZ_*`) for custom fields.
- Consider BDC for VA21 when document flow and full pricing/conditions must mirror the dialog transaction.

## Must-have fields checklist (quotes)
- `VBAK`: `VBELN`, `VBTYP='B'`, `AUART`, `ANGDT`, `BNDDT`, `NETWR`, `WAERK`, partner fields.
- `VBAP`: `POSNR`, `MATNR`, `KWMENG`, `PSTYV`, `ABSTA`, `MEINS`.
- `VBUK`/`VBUP`: status/completion flags.
- `VBFA`: sample links for document flow (predecessor/successor, item numbers).
- `TVAK`: quotation type config (defaults, validity, copy rules).
