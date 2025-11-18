/**
 * Tests for MCP Server Tools
 */

import { parseSapTableTool } from '../src/mcp-server/tools/parse-table';
import { validateAbapSyntax } from '../src/mcp-server/tools/validate-abap';
import { generateODataMetadata } from '../src/mcp-server/tools/generate-metadata';
import { extractCustomizations } from '../src/mcp-server/tools/extract-customizations';
import * as fs from 'fs';
import * as path from 'path';

describe('MCP Tools', () => {
  describe('parseSapTableTool', () => {
    it('should have correct tool metadata', () => {
      expect(parseSapTableTool.name).toBe('parse_sap_table');
      expect(parseSapTableTool.description).toContain('Parse SAP table');
      expect(parseSapTableTool.parameters.type).toBe('object');
    });

    it('should parse a valid table structure', async () => {
      const ddicExport = `
Table: VBAK

Field         Data Type  Length  Description
VBELN         CHAR       10      Sales Document
ERDAT         DATS       8       Creation Date
NETWR         CURR       15,2    Net Value
`;

      const result = await parseSapTableTool.handler({
        table_name: 'VBAK',
        ddic_export: ddicExport,
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.tableName).toBe('VBAK');
      expect(parsed.totalFields).toBeGreaterThan(0);
    });

    it('should handle parsing errors gracefully', async () => {
      const result = await parseSapTableTool.handler({
        table_name: 'TEST',
        ddic_export: '',
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.totalFields).toBe(0);
    });
  });

  describe('validateAbapSyntax', () => {
    it('should have correct tool metadata', () => {
      expect(validateAbapSyntax.name).toBe('validate_abap_syntax');
      expect(validateAbapSyntax.description).toContain('ABAP syntax');
      expect(validateAbapSyntax.parameters.required).toContain('code');
    });

    it('should validate correct ABAP code', async () => {
      const code = `
DATA lv_value TYPE string.
lv_value = 'test'.
WRITE lv_value.
`;

      const result = await validateAbapSyntax.handler({
        code,
        sap_version: 'ECC6',
      });

      expect(result.content).toHaveLength(1);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.summary.status).toBe('PASS');
    });

    it('should detect ABAP syntax errors', async () => {
      const code = `
DATA lv_value TYPE string
lv_value = 'test'
`;

      const result = await validateAbapSyntax.handler({
        code,
        sap_version: 'ECC6',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.summary.errorCount).toBeGreaterThan(0);
    });

    it('should handle validation errors gracefully', async () => {
      const result = await validateAbapSyntax.handler({
        code: 'INVALID ABAP CODE WITHOUT PROPER STRUCTURE',
        sap_version: 'S4HANA',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('generateODataMetadata', () => {
    it('should have correct tool metadata', () => {
      expect(generateODataMetadata.name).toBe('generate_odata_metadata');
      expect(generateODataMetadata.description).toContain('OData');
      expect(generateODataMetadata.parameters.required).toContain('entity_name');
    });

    it('should generate valid OData metadata', async () => {
      const result = await generateODataMetadata.handler({
        entity_name: 'Quote',
        properties: [
          { name: 'ID', type: 'Edm.String', nullable: false, maxLength: 10 },
          { name: 'Amount', type: 'Edm.Decimal', nullable: true },
        ],
        keys: ['ID'],
      });

      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('<?xml');
      expect(result.content[0].text).toContain('QuoteType');
      expect(result.content[0].text).toContain('<PropertyRef Name="ID"/>');
    });

    it('should validate generated metadata', async () => {
      const result = await generateODataMetadata.handler({
        entity_name: 'Test',
        properties: [{ name: 'TestID', type: 'Edm.String' }],
        keys: ['TestID'],
      });

      expect(result.content[1].text).toContain('Validation Result');
    });

    it('should handle generation errors gracefully', async () => {
      const result = await generateODataMetadata.handler({
        entity_name: '',
        properties: [],
        keys: [],
      });

      expect(result.content).toHaveLength(2);
    });
  });

  describe('extractCustomizations', () => {
    beforeAll(() => {
      // Create a temporary test config file
      const testDir = path.join(__dirname, '../temp-test');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const testConfig = `
Table: ZTABLE

Field         Data Type
ZZFIELD1      CHAR
ZZFIELD2      NUMC
`;

      fs.writeFileSync(path.join(testDir, 'test-config.txt'), testConfig);
    });

    afterAll(() => {
      // Cleanup
      const testDir = path.join(__dirname, '../temp-test');
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should have correct tool metadata', () => {
      expect(extractCustomizations.name).toBe('extract_sap_customizations');
      expect(extractCustomizations.description).toContain('customizations');
      expect(extractCustomizations.parameters.required).toContain('config_files');
    });

    it('should extract customizations from config files', async () => {
      const testFile = path.join(__dirname, '../temp-test/test-config.txt');

      const result = await extractCustomizations.handler({
        config_files: [testFile],
      });

      expect(result.content).toHaveLength(1);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.summary).toBeDefined();
      expect(parsed.details).toBeDefined();
    });

    it('should handle non-existent files gracefully', async () => {
      const result = await extractCustomizations.handler({
        config_files: ['/non/existent/file.txt'],
      });

      expect(result.content).toHaveLength(1);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.summary.totalTables).toBe(0);
    });

    it('should support focus_area parameter', async () => {
      const testFile = path.join(__dirname, '../temp-test/test-config.txt');

      const result = await extractCustomizations.handler({
        config_files: [testFile],
        focus_area: 'tables',
      });

      expect(result.content).toHaveLength(1);
    });
  });
});
