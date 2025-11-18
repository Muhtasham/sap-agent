/**
 * MCP Tool: Extract SAP customizations
 */

import { z } from 'zod';
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { CustomizationParser } from '../../parsers/customization-parser';

const extractCustomizationsArgs = {
  config_files: z.array(z.string()),
  focus_area: z.enum(['tables', 'fields', 'bapis', 'exits']).optional(),
};

const extractCustomizationsSchema = z.object(extractCustomizationsArgs);

type ExtractCustomizationsInput = z.infer<typeof extractCustomizationsSchema>;

export const extractCustomizations = tool(
  'extract_sap_customizations',
  'Analyze provided SAP configuration files to find customizations',
  extractCustomizationsArgs,
  async (args: ExtractCustomizationsInput) => {
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
                  customFieldTables:
                    Object.keys(customizations.customFields || {}).length,
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
