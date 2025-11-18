/**
 * MCP Tool: Validate ABAP syntax
 */

import { z } from 'zod';
import { ABAPSyntaxValidator } from '../../validators/abap-syntax';
import { SAPVersion } from '../../types';

export const validateAbapSyntax = {
  name: 'validate_abap_syntax',
  description: 'Perform basic ABAP syntax validation',
  parameters: {
    type: 'object' as const,
    properties: {
      code: {
        type: 'string',
        description: 'ABAP code to validate',
      },
      sap_version: {
        type: 'string',
        enum: ['R3', 'ECC6', 'S4HANA'],
        description: 'Target SAP version',
      },
    },
    required: ['code', 'sap_version'],
  },
  async handler(args: z.infer<typeof argsSchema>) {
    try {
      const validation = ABAPSyntaxValidator.validate(
        args.code,
        args.sap_version as SAPVersion
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                valid: validation.isValid,
                errors: validation.errors,
                warnings: validation.warnings,
                summary: {
                  errorCount: validation.errors.length,
                  warningCount: validation.warnings.length,
                  status: validation.isValid ? 'PASS' : 'FAIL',
                },
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
              error: 'Failed to validate ABAP code',
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
  code: z.string(),
  sap_version: z.enum(['R3', 'ECC6', 'S4HANA']),
});
