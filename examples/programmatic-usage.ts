/**
 * Programmatic Usage Example
 * Demonstrates how to use the generator programmatically in your application
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import {
  quoteEndpointAgent,
  sapContextAgent,
  abapCodeGenerator,
  testGenerator,
  deploymentGuide
} from '../src/agents';
import { parseSapTableTool } from '../src/mcp-server/tools/parse-table';
import { validateAbapSyntax } from '../src/mcp-server/tools/validate-abap';
import { generateODataMetadata } from '../src/mcp-server/tools/generate-metadata';
import { extractCustomizations } from '../src/mcp-server/tools/extract-customizations';
import { createSdkMcpServer } from '@modelcontextprotocol/sdk/server/index.js';

async function programmaticExample() {
  console.log('=== Programmatic SAP Endpoint Generator Example ===\n');

  // Create the MCP server with SAP tools
  const sapTools = createSdkMcpServer({
    name: 'sap-tools',
    version: '1.0.0',
    tools: [
      parseSapTableTool,
      validateAbapSyntax,
      generateODataMetadata,
      extractCustomizations
    ]
  });

  // Define the generation task
  const generationTask = `
Generate a SAP quote creation endpoint for customer "techcorp" with the following requirements:

SAP Version: ECC6

Configuration Files:
- ./examples/sample-sap-config/VBAK_structure.txt
- ./examples/sample-sap-config/custom_fields.txt

Requirements:
- Quote fields: customer_id, quote_date, valid_until, total_amount, currency
- Custom fields:
  * ZZPRIORITY: Customer priority (1-5)
  * ZZREFERRAL: Referral source
- Business logic: Apply 10% discount for priority 1 customers

Output Directory: ./output/techcorp

Process:
1. Analyze the SAP configuration files
2. Generate ABAP function module with custom field handling
3. Generate OData service definition
4. Generate DPC and MPC extension classes
5. Create comprehensive tests
6. Write deployment guide

Save all files to the output directory.
  `.trim();

  try {
    console.log('Starting programmatic generation...\n');

    // Use the query function with streaming input
    async function* generateMessages() {
      yield {
        type: 'user' as const,
        message: {
          role: 'user' as const,
          content: generationTask
        }
      };
    }

    let currentStep = '';
    let filesGenerated: string[] = [];

    for await (const message of query({
      prompt: generateMessages(),
      options: {
        cwd: process.cwd(),

        // Register all agents
        agents: {
          'sap-context': sapContextAgent,
          'abap-generator': abapCodeGenerator,
          'test-generator': testGenerator,
          'deployment-guide': deploymentGuide
        },

        // Register MCP server with SAP tools
        mcpServers: {
          'sap-tools': sapTools
        },

        // Allow necessary tools
        allowedTools: [
          'Read', 'Write', 'Edit', 'Grep', 'Glob', 'Task',
          'mcp__sap-tools__parse_sap_table',
          'mcp__sap-tools__validate_abap_syntax',
          'mcp__sap-tools__generate_odata_metadata',
          'mcp__sap-tools__extract_sap_customizations'
        ],

        // Configuration
        model: 'claude-sonnet-4-20250514',
        maxTurns: 30,
        maxThinkingTokens: 10000,

        // System prompt
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code',
          append: `
You are an expert SAP ABAP developer. Generate production-ready code with:
- Transaction safety (COMMIT/ROLLBACK)
- Authorization checks
- Comprehensive error handling
- SAP naming conventions (Z* namespace)
          `
        }
      }
    })) {
      // Track progress
      if (message.type === 'assistant') {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            console.log('[Assistant]:', block.text.substring(0, 100) + '...');
          }

          if (block.type === 'tool_use') {
            console.log(`[Tool]: ${block.name}`);

            if (block.name === 'Write') {
              const filePath = (block.input as any).file_path;
              filesGenerated.push(filePath);
              console.log(`  → Writing: ${filePath}`);
            }
          }
        }
      }

      if (message.type === 'result') {
        console.log('\n' + '='.repeat(70));
        console.log('GENERATION COMPLETE');
        console.log('='.repeat(70));

        if (message.subtype === 'success') {
          console.log('Status: Success ✓');
          console.log(`Cost: $${message.total_cost_usd.toFixed(4)}`);
          console.log(`Duration: ${(message.duration_ms / 1000).toFixed(2)}s`);

          console.log(`\nFiles generated (${filesGenerated.length}):`);
          filesGenerated.forEach(file => console.log(`  - ${file}`));
        } else {
          console.log('Status: Error ✗');
          console.log('Error:', message.result);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error during programmatic generation:', error);
    throw error;
  }
}

// Run the example
if (require.main === module) {
  programmaticExample().catch(console.error);
}

export { programmaticExample };
