/**
 * MCP Tool: Parse SAP table structure
 */

import { tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DDICParser } from '../../parsers/ddic-parser';

export const parseSapTableTool = tool(
  'parse_sap_table',
  'Parse SAP table structure from DDIC export or SE11 documentation',
  {
    table_name: z.string().describe('SAP table name (e.g., VBAK, VBAP)'),
    ddic_export: z.string().describe('DDIC export text or SE11 structure output'),
  },
  async (args) => {
    try {
      const tableStructure = DDICParser.parseTableStructure(
        args.table_name,
        args.ddic_export
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                tableName: tableStructure.tableName,
                description: tableStructure.description,
                totalFields: tableStructure.fields.length,
                fields: tableStructure.fields,
                keys: tableStructure.keys,
                customFields: tableStructure.customFields,
                customFieldCount: tableStructure.customFields.length,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Failed to parse table structure',
              message: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  }
);
