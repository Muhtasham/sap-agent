/**
 * MCP Tool: Parse SAP table structure
 */

import { z } from 'zod';
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { DDICParser } from '../../parsers/ddic-parser';

const parseSapTableArgs = {
  table_name: z.string(),
  ddic_export: z.string(),
};

const parseSapTableSchema = z.object(parseSapTableArgs);

type ParseSapTableInput = z.infer<typeof parseSapTableSchema>;

export const parseSapTableTool = tool(
  'parse_sap_table',
  'Parse SAP table structure from DDIC export or SE11 documentation',
  parseSapTableArgs,
  async (args: ParseSapTableInput) => {
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
