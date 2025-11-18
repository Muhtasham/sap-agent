/**
 * Additional comprehensive tests for Customization Parser
 */

import { CustomizationParser } from '../src/parsers/customization-parser';
import * as path from 'path';
import * as fs from 'fs';

describe('CustomizationParser - Additional Coverage', () => {
  const testDir = path.join(__dirname, '../temp-customization-test');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create test files for different scenarios
    const structureWithTable = `
Table: ZTESTSTRUCTURE

Field         Data Type  Length
ZZFIELD1      CHAR       10
ZZFIELD2      NUMC       5
`;
    fs.writeFileSync(path.join(testDir, 'structure_with_table.txt'), structureWithTable);

    const structureWithoutTable = `
Field         Data Type  Length
FIELD1        CHAR       10
`;
    fs.writeFileSync(path.join(testDir, 'structure_no_table.txt'), structureWithoutTable);

    const customFields = `
Table: VBAK
ZZFIELD    CHAR    10    Custom

Table: VBAP
YYFIELD    NUMC    5     Another
`;
    fs.writeFileSync(path.join(testDir, 'custom_fields_multi.txt'), customFields);

    const exitFile = `
EXIT_FUNCTION_001
EXIT_FUNCTION_002
EXIT_MODULE_003
`;
    fs.writeFileSync(path.join(testDir, 'exits_list.txt'), exitFile);

    const bapiFile = `
BAPI Documentation
Z_BAPI_CREATE_QUOTE
`;
    fs.writeFileSync(path.join(testDir, 'bapi_file.txt'), bapiFile);
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('analyzeConfigs - file type detection', () => {
    it('should process table structure files', async () => {
      const files = [path.join(testDir, 'structure_with_table.txt')];

      const result = await CustomizationParser.analyzeConfigs(files);

      expect(result.tables).toBeDefined();
      expect(result.tables!.length).toBe(1);
    });

    it('should process custom fields files', async () => {
      const files = [path.join(testDir, 'custom_fields_multi.txt')];

      const result = await CustomizationParser.analyzeConfigs(files);

      expect(result.customFields).toBeDefined();
      expect(Object.keys(result.customFields!).length).toBe(2);
    });

    it('should process exit files', async () => {
      const files = [path.join(testDir, 'exits_list.txt')];

      const result = await CustomizationParser.analyzeConfigs(files);

      expect(result.userExits).toBeDefined();
      expect(result.userExits!.length).toBe(3);
    });

    it('should process BAPI files', async () => {
      const files = [path.join(testDir, 'bapi_file.txt')];

      const result = await CustomizationParser.analyzeConfigs(files);

      expect(result).toBeDefined();
    });

    it('should handle enhancement files', async () => {
      const enhancementFile = path.join(testDir, 'enhancement.txt');
      fs.writeFileSync(enhancementFile, 'ENHANCEMENT_001');

      const result = await CustomizationParser.analyzeConfigs([enhancementFile]);

      expect(result).toBeDefined();

      fs.unlinkSync(enhancementFile);
    });

    it('should extract table name from filename', async () => {
      const testFile = path.join(testDir, 'TABLENAME_structure.txt');
      fs.writeFileSync(testFile, 'Field Type\nTEST CHAR 10');

      const result = await CustomizationParser.analyzeConfigs([testFile]);

      expect(result.tables).toBeDefined();
      expect(result.tables!.length).toBe(1);
      expect(result.tables![0].tableName).toBe('TABLENAME');

      fs.unlinkSync(testFile);
    });

    it('should handle structure without table name', async () => {
      const files = [path.join(testDir, 'structure_no_table.txt')];

      const result = await CustomizationParser.analyzeConfigs(files);

      expect(result).toBeDefined();
    });

    it('should collect custom fields from table structure', async () => {
      const files = [path.join(testDir, 'structure_with_table.txt')];

      const result = await CustomizationParser.analyzeConfigs(files);

      expect(result.customFields).toBeDefined();
      // Custom fields should be collected if the table has ZZ/YY fields
      if (result.customFields!['ZTESTSTRUCTURE']) {
        expect(result.customFields!['ZTESTSTRUCTURE'].length).toBe(2);
      } else {
        // If not collected at table level, they should still be parsed in the table fields
        expect(result.tables!.length).toBe(1);
        expect(result.tables![0].customFields.length).toBe(2);
      }
    });
  });

  describe('extractTableName', () => {
    it('should extract from filename pattern', () => {
      const tableName = CustomizationParser['extractTableName']('VBAK_structure.txt', '');

      expect(tableName).toBe('VBAK');
    });

    it('should extract from content with Table: prefix', () => {
      const content = 'Table: CUSTOMTABLE\nField Data';
      const tableName = CustomizationParser['extractTableName']('file.txt', content);

      expect(tableName).toBe('CUSTOMTABLE');
    });

    it('should return null if no table name found', () => {
      const tableName = CustomizationParser['extractTableName']('file.txt', 'no table here');

      expect(tableName).toBeNull();
    });
  });

  describe('extractUserExits', () => {
    it('should extract EXIT_ patterns', () => {
      const content = `
Some text
EXIT_SAPMV45A_001 here
Another EXIT_CUSTOM_002
`;

      const exits = CustomizationParser['extractUserExits'](content);

      expect(exits.length).toBe(2);
      expect(exits).toContain('EXIT_SAPMV45A_001');
      expect(exits).toContain('EXIT_CUSTOM_002');
    });

    it('should handle content with no exits', () => {
      const exits = CustomizationParser['extractUserExits']('No exits here');

      expect(exits).toEqual([]);
    });
  });

  describe('extractCustomObjects - edge cases', () => {
    it('should handle multiple Z objects on same line', () => {
      const content = 'ZTABLE1 ZTABLE2 ZTABLE3 YTABLE4';

      const result = CustomizationParser.extractCustomObjects(content);

      expect(result.tables.length).toBeGreaterThanOrEqual(4);
    });

    it('should filter out short names', () => {
      const content = 'Z1 ZZ ZZLONGER YTABLE';

      const result = CustomizationParser.extractCustomObjects(content);

      expect(result.tables).toContain('ZZLONGER');
      expect(result.tables).toContain('YTABLE');
      // Short ones should be filtered
      expect(result.tables).not.toContain('Z1');
    });

    it('should extract YY fields', () => {
      const content = 'YYFIELD1 YYFIELD2 ZZFIELD3';

      const result = CustomizationParser.extractCustomObjects(content);

      expect(result.fields).toContain('YYFIELD1');
      expect(result.fields).toContain('YYFIELD2');
      expect(result.fields).toContain('ZZFIELD3');
    });

    it('should deduplicate entries', () => {
      const content = 'ZTABLE ZTABLE ZTABLE ZZFIELD ZZFIELD';

      const result = CustomizationParser.extractCustomObjects(content);

      const tableCount = result.tables.filter(t => t === 'ZTABLE').length;
      const fieldCount = result.fields.filter(f => f === 'ZZFIELD').length;

      expect(tableCount).toBe(1);
      expect(fieldCount).toBe(1);
    });

    it('should not extract standard tables', () => {
      const content = 'VBAK VBAP MARA KNA1 ZTABLE';

      const result = CustomizationParser.extractCustomObjects(content);

      expect(result.tables).toContain('ZTABLE');
      expect(result.tables).not.toContain('VBAK');
      expect(result.tables).not.toContain('VBAP');
    });
  });
});
