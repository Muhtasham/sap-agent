/**
 * Tests for SAP parsers
 */

import { DDICParser } from '../src/parsers/ddic-parser';
import { CustomizationParser } from '../src/parsers/customization-parser';
import * as path from 'path';
import * as fs from 'fs';

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
  const testDir = path.join(__dirname, '../temp-parser-test');

  beforeAll(() => {
    // Create test directory and files
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create test structure file
    const structureContent = `
Table: ZTESTTABLE

Field         Data Type  Length  Description
ZZFIELD1      CHAR       10      Test Field 1
ZZFIELD2      NUMC       5       Test Field 2
NORMALFIELD   CHAR       20      Normal Field
`;
    fs.writeFileSync(path.join(testDir, 'ZTESTTABLE_structure.txt'), structureContent);

    // Create custom fields file
    const customFieldsContent = `
Table: VBAK
ZZPRIORITY    NUMC    1    Priority
ZZREGION      CHAR    10   Region

Table: VBAP
YYWARRANTY    NUMC    2    Warranty
`;
    fs.writeFileSync(path.join(testDir, 'custom_fields.txt'), customFieldsContent);

    // Create user exits file
    const exitsContent = `
User Exit: EXIT_SAPMV45A_001
User Exit: EXIT_SAPMV45A_002
Enhancement: Z_CUSTOM_ENHANCEMENT
`;
    fs.writeFileSync(path.join(testDir, 'exits.txt'), exitsContent);

    // Create BAPI file
    const bapiContent = `
BAPI: Z_BAPI_QUOTE_CREATE
Function module documentation
`;
    fs.writeFileSync(path.join(testDir, 'bapi_doc.txt'), bapiContent);
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('analyzeConfigs', () => {
    it('should analyze structure files', async () => {
      const configFiles = [path.join(testDir, 'ZTESTTABLE_structure.txt')];

      const result = await CustomizationParser.analyzeConfigs(configFiles);

      expect(result.tables).toBeDefined();
      expect(result.tables!.length).toBe(1);
      expect(result.tables![0].tableName).toBe('ZTESTTABLE');
    });

    it('should analyze custom fields files', async () => {
      const configFiles = [path.join(testDir, 'custom_fields.txt')];

      const result = await CustomizationParser.analyzeConfigs(configFiles);

      expect(result.customFields).toBeDefined();
      expect(result.customFields!['VBAK']).toBeDefined();
      expect(result.customFields!['VBAP']).toBeDefined();
    });

    it('should extract user exits', async () => {
      const configFiles = [path.join(testDir, 'exits.txt')];

      const result = await CustomizationParser.analyzeConfigs(configFiles);

      expect(result.userExits).toBeDefined();
      expect(result.userExits!.length).toBeGreaterThan(0);
      expect(result.userExits).toContain('EXIT_SAPMV45A_001');
      expect(result.userExits).toContain('EXIT_SAPMV45A_002');
    });

    it('should handle non-existent files', async () => {
      const configFiles = [path.join(testDir, 'nonexistent.txt')];

      const result = await CustomizationParser.analyzeConfigs(configFiles);

      expect(result.tables).toEqual([]);
    });

    it('should analyze multiple files', async () => {
      const configFiles = [
        path.join(testDir, 'ZTESTTABLE_structure.txt'),
        path.join(testDir, 'custom_fields.txt'),
        path.join(testDir, 'exits.txt'),
      ];

      const result = await CustomizationParser.analyzeConfigs(configFiles);

      expect(result.tables!.length).toBe(1);
      expect(Object.keys(result.customFields!).length).toBeGreaterThan(0);
      expect(result.userExits!.length).toBeGreaterThan(0);
    });

    it('should support focus_area parameter', async () => {
      const configFiles = [path.join(testDir, 'ZTESTTABLE_structure.txt')];

      const result = await CustomizationParser.analyzeConfigs(configFiles, 'tables');

      expect(result).toBeDefined();
    });

    it('should extract custom fields from tables', async () => {
      const configFiles = [path.join(testDir, 'ZTESTTABLE_structure.txt')];

      const result = await CustomizationParser.analyzeConfigs(configFiles);

      expect(result.customFields).toBeDefined();
      const customFields = result.customFields!['ZTESTTABLE'];
      expect(customFields).toBeDefined();
      expect(customFields.length).toBe(2); // ZZFIELD1 and ZZFIELD2
    });
  });

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

    it('should handle empty content', () => {
      const result = CustomizationParser.extractCustomObjects('');

      expect(result.tables).toEqual([]);
      expect(result.fields).toEqual([]);
    });

    it('should filter short table names', () => {
      const content = 'ZT1 ZTT ZTABLE YTABLE';

      const result = CustomizationParser.extractCustomObjects(content);

      // ZT1 (length 3) and ZTT (length 3) should be filtered out
      expect(result.tables).toContain('ZTABLE');
      expect(result.tables).toContain('YTABLE');
      expect(result.tables).not.toContain('ZT1');
      expect(result.tables).not.toContain('ZTT');
    });

    it('should deduplicate results', () => {
      const content = 'ZTABLE ZTABLE ZZFIELD ZZFIELD';

      const result = CustomizationParser.extractCustomObjects(content);

      expect(result.tables.filter(t => t === 'ZTABLE').length).toBe(1);
      expect(result.fields.filter(f => f === 'ZZFIELD').length).toBe(1);
    });

    it('should extract from multiple lines', () => {
      const content = `
Line 1: ZTABLE1 ZZFIELD1
Line 2: YTABLE2 YYFIELD2
Line 3: ZQUOTE ZZSTATUS
      `;

      const result = CustomizationParser.extractCustomObjects(content);

      expect(result.tables.length).toBeGreaterThanOrEqual(3);
      expect(result.fields.length).toBeGreaterThanOrEqual(3);
    });
  });
});
