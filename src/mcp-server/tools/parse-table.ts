/**
 * MCP Tool: Parse SAP table structure
 */

import { z } from 'zod';
import { DDICParser } from '../../parsers/ddic-parser';

export const parseSapTableTool = {
  name: 'parse_sap_table',
  description: 'Parse SAP table structure from DDIC export or SE11 documentation',
  parameters: {
    type: 'object' as const,
    properties: {
      table_name: {
        type: 'string',
        description: 'SAP table name (e.g., VBAK, VBAP)',
      },
      ddic_export: {
        type: 'string',
        description: 'DDIC export text or SE11 structure output',
      },
    },
    required: ['table_name', 'ddic_export'],
  },
  async handler(args: z.infer<typeof argsSchema>) {
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
  },
};

const argsSchema = z.object({
  table_name: z.string(),
  ddic_export: z.string(),
});
