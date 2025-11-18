/**
 * Parser for SAP DDIC (Data Dictionary) exports
 * Extracts table structures from SE11 exports or DDIC documentation
 */

import { SAPTable, SAPField } from '../types';

export class DDICParser {
  /**
   * Parse DDIC export text into structured table definition
   */
  static parseTableStructure(tableName: string, ddicExport: string): SAPTable {
    const fields: SAPField[] = [];
    const keys: string[] = [];
    const customFields: SAPField[] = [];

    // Split into lines and process
    const lines = ddicExport.split('\n');

    let inFieldSection = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect field section start
      if (trimmed.match(/^(Field|Component|Column)\s+Data Type/i)) {
        inFieldSection = true;
        continue;
      }

      // Skip empty lines and headers
      if (!trimmed || trimmed.startsWith('-') || trimmed.startsWith('=')) {
        continue;
      }

      if (inFieldSection) {
        const field = this.parseFieldLine(trimmed);
        if (field) {
          fields.push(field);

          // Check if it's a key field
          if (trimmed.includes('KEY') || trimmed.includes('*')) {
            keys.push(field.name);
            field.isKey = true;
          }

          // Custom fields typically start with ZZ or YY
          if (field.name.startsWith('ZZ') || field.name.startsWith('YY')) {
            field.isCustom = true;
            customFields.push(field);
          }
        }
      }
    }

    return {
      tableName,
      fields,
      keys,
      customFields,
    };
  }

  /**
   * Parse a single field line from DDIC export
   * Example formats:
   * - "VBELN     CHAR  10  Sales Document"
   * - "ERDAT     DATS   8  Creation Date"
   * - "* MANDT   CLNT   3  Client"
   */
  private static parseFieldLine(line: string): SAPField | null {
    // Remove key indicator if present
    const cleanLine = line.replace(/^\*\s*/, '');

    // Split by whitespace (2+ spaces typically separate columns)
    const parts = cleanLine.split(/\s{2,}/).filter(p => p.trim());

    if (parts.length < 2) {
      return null;
    }

    const [namePart, typePart, ...rest] = parts;

    // Parse field name
    const nameMatch = namePart.match(/^([A-Z0-9_]+)/i);
    if (!nameMatch) {
      return null;
    }
    const name = nameMatch[1];

    // Parse data type and length
    const typeMatch = typePart.match(/^([A-Z]+)\s*(\d+)?\s*(\d+)?/i);
    if (!typeMatch) {
      return null;
    }

    const dataType = typeMatch[1];
    const length = typeMatch[2] ? parseInt(typeMatch[2]) : undefined;
    const decimals = typeMatch[3] ? parseInt(typeMatch[3]) : undefined;

    // Description is usually the last part
    const description = rest.join(' ').trim() || undefined;

    return {
      name,
      dataType,
      length,
      decimals,
      description,
      nullable: !line.startsWith('*'), // Key fields are not nullable
    };
  }

  /**
   * Parse custom field definitions
   */
  static parseCustomFields(customFieldExport: string): Record<string, SAPField[]> {
    const result: Record<string, SAPField[]> = {};
    const lines = customFieldExport.split('\n');

    let currentTable = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect table name
      const tableMatch = trimmed.match(/^Table:\s*([A-Z0-9_]+)/i);
      if (tableMatch) {
        currentTable = tableMatch[1];
        result[currentTable] = [];
        continue;
      }

      // Parse field if we have a current table
      if (currentTable && trimmed) {
        const field = this.parseFieldLine(trimmed);
        if (field) {
          result[currentTable].push(field);
        }
      }
    }

    return result;
  }

  /**
   * Parse BAPI signatures from documentation
   */
  static parseBAPISignature(bapiDoc: string) {
    // Placeholder for BAPI parsing
    // In real implementation, this would parse BAPI documentation
    // from SE37 export or similar
    return {
      name: '',
      importing: [],
      exporting: [],
      tables: [],
    };
  }
}
