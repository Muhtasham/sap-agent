# Collecting SAP Context (R/3 and ECC6)

This guide shows exactly what to pull from an SAP R/3 or ECC6 system so the generator has enough context to produce correct ABAP, OData metadata, and tests. All steps use standard SAP GUI transactions and create plain text files you can commit in `sap-config/`.

For quotation-heavy projects, see `SAP_QUOTATION_REFERENCE.md` for transaction notes, VA25 vs VA25N guidance, and additional data to collect. To validate your own system settings before generation, use the workbook in `SAP_QUOTATION_VALIDATION.md`.
At minimum for quotations, capture `VBAK`/`VBAP` structures, any append fields, key customizing (`TVAK`), and sample `VBFA` links to show document flow.

## What to collect (minimum viable package)
- Table structures for the business object (for quotes: `VBAK` header, `VBAP` items; add others like `KNA1`, `MARA` if referenced)
- Custom/append fields (`ZZ*` or `YY*`) on those tables
- Any BAPI/function module signatures you want to wrap or call
- Known user exits/BAdIs, implicit enhancements, or include spots the code must respect
- Optional but helpful: a couple of sample records (sanitized) and key customizing values (sales doc type, item category, currency rules)

## Export table structures (SE37 - version safe)
This path works on both R/3 and ECC6 and captures field tech settings reliably.
1) Go to transaction `SE37`.
2) Enter function module `DDIF_FIELDINFO_GET`, choose Display, then Execute (F8).
3) Fill `TABNAME` with your table (e.g., `VBAK`). Leave `FIELDNAME` blank to get all fields.
4) Execute. In the ALV list, choose `System -> List -> Save -> Local File -> Spreadsheet`.
5) Save as `VBAK_structure.txt` under `sap-config/`.
6) Repeat for `VBAP` and any additional tables.

Resulting file should look like:
```
Table: VBAK (Header)
Field  Data Type  Length  Decimals  Description
MANDT  CLNT       3       0         Client
VBELN  CHAR       10      0         Sales Document
ERDAT  DATS       8       0         Creation Date
...
```

## Capture custom/append fields
1) In `SE11`, display the table.
2) Choose `Extras -> Append Structure -> Display` to view Z/Y appends.
3) Note every `ZZ*`/`YY*` field (name, data element, length, description).
4) Save them to `custom_fields.txt` using the same format as above, grouped by table:
```
Table: VBAK
Field Name  Type  Length  Description
ZZPRIORITY  NUMC  1       Customer priority (1-5)
ZZREFERRAL  CHAR  20      Referral source
```

## Export BAPI/function module signatures (SE37)
If you want the generator to call or align to an existing API (for example `BAPI_QUOTATION_CREATEFROMDATA2`):
1) In `SE37`, display the function module.
2) Record Importing, Exporting, Changing, and Tables parameters with their structures.
3) Use `System -> List -> Save -> Local File -> Unconverted` to export the parameter list to `BAPI_QUOTATION_CREATEFROMDATA2.txt`.
4) Add a short note about required fields and common return messages if known.

## Identify exits and enhancements
Include anything the generated code must call or avoid:
- User exits: `SMOD`/`CMOD` for the relevant enhancement project (e.g., `V60A0001`), list active components like `EXIT_SAPMV45A_001`.
- BAdIs: `SE18`/`SE19`, note active implementations and methods.
- Implicit enhancements: from `SE80` or the source include name.
Save a small text file `exits_and_enhancements.txt` describing the hooks and what they do.

## Optional: sample data and customizing cues
- Sample records: In `SE16N`, display a couple of rows, then `List -> Export -> Local File -> Spreadsheet`. Mask PII; keep just enough to show mandatory fields and typical values.
- Customizing: Note the sales document type (e.g., `QT`), item category, currency and rounding rules, and any number range objects the code should respect.
Document these in `business_context.txt`.

## Organize files for the generator
Place the collected files in your project (for example):
```
sap-config/
  VBAK_structure.txt
  VBAP_structure.txt
  custom_fields.txt
  BAPI_QUOTATION_CREATEFROMDATA2.txt   # optional, if relevant
  exits_and_enhancements.txt           # optional
  business_context.txt                 # optional
```

Generate with:
```bash
npx sap-generate quote \
  --customer acme \
  --sap-version ECC6 \
  --config-files sap-config/VBAK_structure.txt sap-config/VBAP_structure.txt sap-config/custom_fields.txt \
  --custom-fields '{"ZZPRIORITY":"Customer priority (1-5)","ZZREFERRAL":"Referral source"}'
```

## Tips to avoid rework
- Keep field names exactly as in SAP (respect case) and include domains like currency/quantity lengths.
- R/3 often has shorter lengths and fewer Unicode fields; double-check character/decimal definitions versus ECC6.
- Mask any production data before saving files.
- Re-run `DDIF_FIELDINFO_GET` after transports to keep structures current.
