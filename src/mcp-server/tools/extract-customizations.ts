/**
 * MCP Tool: Extract SAP customizations
 */

import { tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { CustomizationParser } from '../../parsers/customization-parser';

export const extractCustomizations = tool(
  'extract_sap_customizations',
  'Analyze provided SAP configuration files to find customizations',
  {
    config_files: z
      .array(z.string())
      .describe('Paths to SAP config/export files'),
    focus_area: z
      .enum(['tables', 'fields', 'bapis', 'exits'])
      .optional()
      .describe('What to extract'),
  },
  async (args) => {
    try {
      const customizations = await CustomizationParser.analyzeConfigs(
        args.config_files,
        args.focus_area
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                summary: {
                  totalTables: customizations.tables?.length || 0,
                  customFieldTables: Object.keys(customizations.customFields || {}).length,
                  totalBAPIs: customizations.bapis?.length || 0,
                  totalUserExits: customizations.userExits?.length || 0,
                },
                details: customizations,
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
              error: 'Failed to extract customizations',
              message: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  }
);
