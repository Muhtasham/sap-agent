/**
 * Parser for SAP customizations and extensions
 * Extracts custom fields, user exits, and enhancements
 */

import { SAPCustomization, SAPField } from '../types';
import { DDICParser } from './ddic-parser';
import * as fs from 'fs';

export class CustomizationParser {
  /**
   * Analyze SAP configuration files to extract customizations
   */
  static async analyzeConfigs(
    configFiles: string[],
    focusArea?: 'tables' | 'fields' | 'bapis' | 'exits'
  ): Promise<Partial<SAPCustomization>> {
    const result: Partial<SAPCustomization> = {
      tables: [],
      customFields: {},
      bapis: [],
      userExits: [],
    };

    for (const filePath of configFiles) {
      if (!fs.existsSync(filePath)) {
        console.warn(`Config file not found: ${filePath}`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = filePath.split('/').pop() || '';

      // Detect file type and parse accordingly
      if (fileName.includes('structure') || fileName.includes('table')) {
        const tableName = this.extractTableName(fileName, content);
        if (tableName) {
          const table = DDICParser.parseTableStructure(tableName, content);
          result.tables?.push(table);

          if (table.customFields.length > 0) {
            result.customFields![tableName] = table.customFields;
          }
        }
      } else if (fileName.includes('custom_fields')) {
        const customFields = DDICParser.parseCustomFields(content);
        result.customFields = { ...result.customFields, ...customFields };
      } else if (fileName.includes('bapi') || fileName.includes('function')) {
        // Parse BAPI definitions
        // Implementation would go here
      } else if (fileName.includes('exit') || fileName.includes('enhancement')) {
        // Extract user exits
        const exits = this.extractUserExits(content);
        result.userExits?.push(...exits);
      }
    }

    return result;
  }

  /**
   * Extract table name from file name or content
   */
  private static extractTableName(fileName: string, content: string): string | null {
    // Try to extract from filename (e.g., "VBAK_structure.txt" -> "VBAK")
    const fileMatch = fileName.match(/^([A-Z0-9_]+)_/i);
    if (fileMatch) {
      return fileMatch[1].toUpperCase();
    }

    // Try to extract from content
    const contentMatch = content.match(/Table:\s*([A-Z0-9_]+)/i);
    if (contentMatch) {
      return contentMatch[1].toUpperCase();
    }

    return null;
  }

  /**
   * Extract user exit names from configuration
   */
  private static extractUserExits(content: string): string[] {
    const exits: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Look for user exit patterns
      const exitMatch = line.match(/EXIT_([A-Z0-9_]+)/i);
      if (exitMatch) {
        exits.push(exitMatch[0]);
      }
    }

    return exits;
  }

  /**
   * Extract custom Z/Y tables and fields
   */
  static extractCustomObjects(content: string): { tables: string[]; fields: string[] } {
    const tables: string[] = [];
    const fields: string[] = [];

    const lines = content.split('\n');

    for (const line of lines) {
      // Custom tables (Z* or Y*)
      const tableMatch = line.match(/\b([ZY][A-Z0-9_]+)\b/);
      if (tableMatch && tableMatch[1].length > 3) {
        tables.push(tableMatch[1]);
      }

      // Custom fields (ZZ* or YY*)
      const fieldMatch = line.match(/\b([ZY]{2}[A-Z0-9_]+)\b/);
      if (fieldMatch) {
        fields.push(fieldMatch[1]);
      }
    }

    return {
      tables: [...new Set(tables)],
      fields: [...new Set(fields)],
    };
  }
}
