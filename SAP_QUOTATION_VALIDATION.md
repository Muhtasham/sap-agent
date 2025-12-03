# SAP Quotation Configuration Validation Workbook

Use this checklist to validate your SAP system before running the quote endpoint generator. It aligns with `SAP_DATA_COLLECTION.md` (how to export structures) and `SAP_QUOTATION_REFERENCE.md` (quotations: VA25 vs VA25N, outputs, partner roles, validity, BAPI notes).

## System Snapshot
- System ID / Release: _____________________ (R/3 4.6/4.7 | ECC6 | S/4HANA)
- Unicode: [ ] Yes [ ] No
- Support Pack: ________
- Auditor / Date: ________

## 1) Table structure extraction method
- SE37 `DDIF_FIELDINFO_GET` works for `VBAK`? [ ] Yes [ ] No
- SE37 `DDIF_FIELDINFO_GET` works for `VBAP`? [ ] Yes [ ] No
- LENG/UCLEN present? [ ] Yes [ ] No  (capture both if Unicode)
- Export via System → List → Save → Local File works? [ ] Yes [ ] No
- If SE37 blocked: SE11 export viable? [ ] Yes [ ] No  SE16N Print Preview viable? [ ] Yes [ ] No
- Decision: Preferred extraction path: ____________________

## 2) Quotation list report
- VA25 available and returns expected rows? [ ] Yes [ ] No   Row count: ______
- VA25N present? [ ] Yes [ ] No   If yes, any missing rows vs VA25? [ ] Yes [ ] No
- Decision: Use VA25 only? [ ] Yes [ ] No   Notes: ____________________

## 3) Output determination (quotation)
- Output type used for quotes: [ ] AN00 [ ] Custom: ________
- Medium: [ ] 1 Print [ ] 7 Email   Dispatch time: [ ] 1 Batch [ ] 4 Immediate
- Form/program: ____________________   SmartForm/SAPscript: ____________________
- Partner function for output: ____________________

## 4) Partner roles on quotations
- Roles observed (VA23/`VBPA`): [ ] AG (sold-to) [ ] WE (ship-to) [ ] BP (bill-to) [ ] SP (payer/delivery) [ ] Other: ________
- Mapping needed for generator (defaults AG/WE): ____________________

## 5) Validity & copy control
- Default validity (ANGDT/BNDDT) for your quotation type: __________ days
- VTAA (QT→OR) routines: Header routine ______ ; Item routine ______ ; Schedule routine ______
- VOFM validity check enforced (expired BNDDT blocks VA01)? [ ] Yes [ ] No
- Rejected items (ABGRU) copied? [ ] Blocked [ ] Allowed   Notes: ____________________

## 6) Custom VOFM routines
- Any custom routines (Z/Y) in copy control? [ ] Yes [ ] No  List: ____________________
- Grace period or special logic? ____________________

## 7) Approval workflow (if any)
- Status profile on quotation type (TVAK/BS02): ____________________
- BAdI used (e.g., `BADI_SD_DOCUMENT_CHECK`): ____________________   Active? [ ] Yes [ ] No
- Thresholds/approver rules: ______________________________________________________

## 8) BAPI vs BDC for quotations
- Preferred create method: [ ] BAPI_QUOTATION_CREATEFROMDATA2 [ ] BDC VA21 [ ] Both
- Document flow (VBFA) created by BAPI in your system? [ ] Yes [ ] No
- EXTENSIONIN for custom fields tested? [ ] Yes [ ] No   Append structure name(s): ____________________
- Pricing/conditions auto-derived with BAPI? [ ] Yes [ ] No   Issues: ____________________

## 9) Required fields/artifacts to hand off
- Structures exported: [ ] VBAK [ ] VBAP [ ] VBUK [ ] VBFA samples
- Custom appends captured: [ ] ZZ_VBAK_* [ ] ZZ_VBAP_* (names: ____________________)
- Config exports: [ ] TVAK (quotation type) [ ] VTAA (copy control) [ ] VOFM routines [ ] NACE/VV11 output settings
- Sample data (masked): [ ] Quotations (VBAK/VBAP) [ ] VBFA links (inquiry→quotation→order)
- Partner roles confirmed for BAPI payload: ____________________
- Output type/form confirmed: ____________________

## 10) Action summary
- Must-fix before generation: ______________________________________________________
- Nice-to-have: ______________________________________________________
- Sign-off: ____________________ (name/date)
