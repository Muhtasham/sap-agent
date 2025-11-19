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
   * - "NETWR     CURR   15,2  Net Value" (with decimals)
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

    // Parse data type
    const dataType = typePart.trim();

    // Parse length and decimals
    // Can be in typePart (e.g., "CHAR 10") or in rest[0] (e.g., separate column "15,2")
    let length: number | undefined;
    let decimals: number | undefined;
    let descriptionStart = 0;

    // Check if length is in the type part
    const typeMatch = typePart.match(/^([A-Z]+)\s+(\d+(?:,\d+)?)/i);
    if (typeMatch) {
      // Length is embedded in type part (e.g., "CHAR 10" or "CURR 15,2")
      const lengthStr = typeMatch[2];
      if (lengthStr.includes(',')) {
        const [len, dec] = lengthStr.split(',');
        length = parseInt(len);
        decimals = parseInt(dec);
      } else {
        length = parseInt(lengthStr);
      }
    } else if (rest.length > 0) {
      // Check if first part of rest is a length specification
      const lengthMatch = rest[0].match(/^(\d+)(?:,(\d+))?$/);
      if (lengthMatch) {
        length = parseInt(lengthMatch[1]);
        decimals = lengthMatch[2] ? parseInt(lengthMatch[2]) : undefined;
        descriptionStart = 1; // Description starts from rest[1]
      }
    }

    // Description is the remaining parts after length
    const description = rest.slice(descriptionStart).join(' ').trim() || undefined;

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
  static parseBAPISignature(_bapiDoc: string) {
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
