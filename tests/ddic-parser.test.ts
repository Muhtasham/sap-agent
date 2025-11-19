/**
 * Additional comprehensive tests for DDIC Parser
 */

import { DDICParser } from '../src/parsers/ddic-parser';

describe('DDICParser - Additional Coverage', () => {
  describe('parseFieldLine edge cases', () => {
    it('should handle field with key indicator', () => {
      const line = '* MANDT   CLNT   3   Client';
      const result = DDICParser['parseFieldLine'](line);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('MANDT');
      expect(result?.dataType).toBe('CLNT');
      expect(result?.nullable).toBe(false);
    });

    it('should handle field with decimals in separate column', () => {
      const line = 'NETWR       CURR       15,2    Net Value';
      const result = DDICParser['parseFieldLine'](line);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('NETWR');
      expect(result?.length).toBe(15);
      expect(result?.decimals).toBe(2);
    });

    it('should handle field without length', () => {
      const line = 'TESTFIELD   TYPE';
      const result = DDICParser['parseFieldLine'](line);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('TESTFIELD');
      expect(result?.dataType).toBe('TYPE');
    });

    it('should return null for invalid line', () => {
      const line = 'INVALIDFORMAT';
      const result = DDICParser['parseFieldLine'](line);

      expect(result).toBeNull();
    });

    it('should handle line with no name match', () => {
      const line = '  ';
      const result = DDICParser['parseFieldLine'](line);

      expect(result).toBeNull();
    });
  });

  describe('parseTableStructure edge cases', () => {
    it('should handle empty DDIC export', () => {
      const result = DDICParser.parseTableStructure('EMPTY', '');

      expect(result.tableName).toBe('EMPTY');
      expect(result.fields).toEqual([]);
      expect(result.keys).toEqual([]);
    });

    it('should handle DDIC with only headers', () => {
      const ddicExport = `
Field     Data Type    Length
----------------------------------------
`;

      const result = DDICParser.parseTableStructure('TEST', ddicExport);

      expect(result.tableName).toBe('TEST');
      expect(result.fields).toEqual([]);
    });

    it('should handle custom ZZ fields', () => {
      const ddicExport = `
Field         Data Type  Length  Description
ZZFIELD1      CHAR       10      Custom Field 1
ZZFIELD2      NUMC       5       Custom Field 2
`;

      const result = DDICParser.parseTableStructure('TEST', ddicExport);

      expect(result.customFields.length).toBe(2);
      expect(result.customFields[0].isCustom).toBe(true);
      expect(result.customFields[1].isCustom).toBe(true);
    });

    it('should handle YY custom fields', () => {
      const ddicExport = `
Field         Data Type  Length  Description
YYFIELD1      CHAR       10      Custom Field
`;

      const result = DDICParser.parseTableStructure('TEST', ddicExport);

      expect(result.customFields.length).toBeGreaterThanOrEqual(1);
      const yyField = result.customFields.find(f => f.name === 'YYFIELD1');
      expect(yyField).toBeDefined();
      if (yyField) {
        expect(yyField.isCustom).toBe(true);
      }
    });
  });

  describe('parseCustomFields', () => {
    it('should handle empty export', () => {
      const result = DDICParser.parseCustomFields('');

      expect(Object.keys(result).length).toBe(0);
    });

    it('should handle table without fields', () => {
      const customFieldDoc = `
Table: VBAK

Table: VBAP
`;

      const result = DDICParser.parseCustomFields(customFieldDoc);

      expect(result['VBAK']).toEqual([]);
      expect(result['VBAP']).toEqual([]);
    });

    it('should parse multiple tables with fields', () => {
      const customFieldDoc = `
Table: TABLE1
FIELD1  CHAR  10  Description 1

Table: TABLE2
FIELD2  NUMC  5   Description 2
FIELD3  DATS  8   Description 3
`;

      const result = DDICParser.parseCustomFields(customFieldDoc);

      expect(result['TABLE1'].length).toBe(1);
      expect(result['TABLE2'].length).toBe(2);
    });
  });

  describe('parseBAPISignature', () => {
    it('should return placeholder structure', () => {
      const result = DDICParser.parseBAPISignature('any input');

      expect(result.name).toBe('');
      expect(result.importing).toEqual([]);
      expect(result.exporting).toEqual([]);
      expect(result.tables).toEqual([]);
    });
  });
});
