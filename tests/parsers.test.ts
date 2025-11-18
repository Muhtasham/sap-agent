/**
 * Tests for SAP parsers
 */

import { DDICParser } from '../src/parsers/ddic-parser';
import { CustomizationParser } from '../src/parsers/customization-parser';

describe('DDICParser', () => {
  describe('parseTableStructure', () => {
    it('should parse a basic table structure', () => {
      const ddic = `
Table: VBAK

Field       Data Type  Length  Description
MANDT       CLNT       3       Client
VBELN       CHAR       10      Sales Document
ERDAT       DATS       8       Creation Date
NETWR       CURR       15,2    Net Value
      `;

      const result = DDICParser.parseTableStructure('VBAK', ddic);

      expect(result.tableName).toBe('VBAK');
      expect(result.fields.length).toBeGreaterThan(0);

      const vbelnField = result.fields.find((f) => f.name === 'VBELN');
      expect(vbelnField).toBeDefined();
      expect(vbelnField?.dataType).toBe('CHAR');
      expect(vbelnField?.length).toBe(10);
    });

    it('should identify key fields', () => {
      const ddic = `
Field       Data Type  Length  Description
* MANDT     CLNT       3       Client
* VBELN     CHAR       10      Sales Document
ERDAT       DATS       8       Creation Date
      `;

      const result = DDICParser.parseTableStructure('VBAK', ddic);

      expect(result.keys).toContain('MANDT');
      expect(result.keys).toContain('VBELN');
      expect(result.keys).not.toContain('ERDAT');
    });

    it('should identify custom fields', () => {
      const ddic = `
Field       Data Type  Length  Description
VBELN       CHAR       10      Sales Document
ZZPRIORITY  NUMC       1       Priority
ZZREGION    CHAR       10      Region
      `;

      const result = DDICParser.parseTableStructure('VBAK', ddic);

      expect(result.customFields.length).toBe(2);
      expect(result.customFields.find((f) => f.name === 'ZZPRIORITY')).toBeDefined();
      expect(result.customFields.find((f) => f.name === 'ZZREGION')).toBeDefined();
    });

    it('should handle fields with decimals', () => {
      const ddic = `
Field       Data Type  Length  Description
NETWR       CURR       15,2    Net Value
KWMENG      QUAN       13,3    Quantity
      `;

      const result = DDICParser.parseTableStructure('TEST', ddic);

      const netwr = result.fields.find((f) => f.name === 'NETWR');
      expect(netwr?.length).toBe(15);
      expect(netwr?.decimals).toBe(2);

      const kwmeng = result.fields.find((f) => f.name === 'KWMENG');
      expect(kwmeng?.length).toBe(13);
      expect(kwmeng?.decimals).toBe(3);
    });
  });

  describe('parseCustomFields', () => {
    it('should parse custom fields by table', () => {
      const customFieldDoc = `
Table: VBAK

ZZPRIORITY  NUMC       1       Priority Level
ZZREGION    CHAR       10      Sales Region

Table: VBAP

ZZWARRANTY  NUMC       2       Warranty Months
      `;

      const result = DDICParser.parseCustomFields(customFieldDoc);

      expect(result['VBAK']).toBeDefined();
      expect(result['VBAK'].length).toBe(2);
      expect(result['VBAP']).toBeDefined();
      expect(result['VBAP'].length).toBe(1);
    });
  });
});

describe('CustomizationParser', () => {
  describe('extractCustomObjects', () => {
    it('should extract Z and Y tables', () => {
      const content = `
Some text with ZTABLE1 and YTABLE2 mentioned.
Also ZQUOTE_LOG and YCUSTOM_DATA.
Standard table VBAK should not be extracted.
      `;

      const result = CustomizationParser.extractCustomObjects(content);

      expect(result.tables).toContain('ZTABLE1');
      expect(result.tables).toContain('YTABLE2');
      expect(result.tables).toContain('ZQUOTE_LOG');
      expect(result.tables).not.toContain('VBAK');
    });

    it('should extract custom fields', () => {
      const content = `
Custom fields: ZZPRIORITY, ZZREGION, YYWARRANTY
Regular field: VBELN should not match
      `;

      const result = CustomizationParser.extractCustomObjects(content);

      expect(result.fields).toContain('ZZPRIORITY');
      expect(result.fields).toContain('ZZREGION');
      expect(result.fields).toContain('YYWARRANTY');
      expect(result.fields).not.toContain('VBELN');
    });
  });
});
