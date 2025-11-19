/**
 * MCP Tool: Validate ABAP syntax
 */

import { z } from 'zod';
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { ABAPSyntaxValidator } from '../../validators/abap-syntax';
import { SAPVersion } from '../../types';

const validateAbapArgs = {
  code: z.string(),
  sap_version: z.enum(['R3', 'ECC6', 'S4HANA']),
};

const validateAbapSchema = z.object(validateAbapArgs);

type ValidateAbapInput = z.infer<typeof validateAbapSchema>;

export const validateAbapSyntax = tool(
  'validate_abap_syntax',
  'Perform basic ABAP syntax validation',
  validateAbapArgs,
  async (args: ValidateAbapInput) => {
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
  }
);
