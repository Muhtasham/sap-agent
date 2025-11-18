/**
 * MCP Tool: Extract SAP customizations
 */

import { z } from 'zod';
import { CustomizationParser } from '../../parsers/customization-parser';

export const extractCustomizations = {
  name: 'extract_sap_customizations',
  description: 'Analyze provided SAP configuration files to find customizations',
  parameters: {
    type: 'object' as const,
    properties: {
      config_files: {
        type: 'array',
        items: { type: 'string' },
        description: 'Paths to SAP config/export files',
      },
      focus_area: {
        type: 'string',
        enum: ['tables', 'fields', 'bapis', 'exits'],
        description: 'What to extract',
      },
    },
    required: ['config_files'],
  },
  async handler(args: z.infer<typeof argsSchema>) {
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
  },
};

const argsSchema = z.object({
  config_files: z.array(z.string()),
  focus_area: z.enum(['tables', 'fields', 'bapis', 'exits']).optional(),
});
