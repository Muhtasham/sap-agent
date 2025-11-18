/**
 * SAP Endpoint Generator - Main Entry Point
 * Generates SAP ABAP code for OData endpoints using Claude Agent SDK
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { GenerateEndpointRequest } from './types';
import { sapContextAgent } from './agents/context-analyzer';
import { abapCodeGenerator } from './agents/code-generator';
import { testGenerator } from './agents/test-generator';
import { deploymentGuide } from './agents/deployment-guide';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Generate a complete SAP quote creation endpoint
 */
export async function generateQuoteEndpoint(
  request: GenerateEndpointRequest
): Promise<{ messages: any[]; result: any }> {
  const outputDir = request.outputDir || './output';
  const customerDir = path.join(outputDir, request.customerName);

  // Ensure output directory exists
  if (!fs.existsSync(customerDir)) {
    fs.mkdirSync(customerDir, { recursive: true });
  }

  // Build the main prompt
  const prompt = buildMainPrompt(request);

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     SAP Endpoint Generator - Powered by Claude Agent SDK      ║
╚════════════════════════════════════════════════════════════════╝

Customer: ${request.customerName}
SAP Version: ${request.sapVersion}
Output Directory: ${customerDir}

Starting code generation...
`);

  const result = query({
    prompt,
    options: {
      cwd: process.cwd(),

      // Load ABAP templates from project
      settingSources: ['project'],

      // Register all specialized agents
      agents: {
        'sap-context': sapContextAgent,
        'abap-generator': abapCodeGenerator,
        'test-generator': testGenerator,
        'deployment-guide': deploymentGuide,
      },

      // Allow all necessary tools
      allowedTools: [
        'Read',
        'Write',
        'Edit',
        'Grep',
        'Glob',
        'Bash',
        'Task',
      ],

      // Use Claude Code system prompt for best file handling
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append: `
You are an expert SAP ABAP developer with deep knowledge of OData services.

CRITICAL RULES:
- Always follow SAP naming conventions (Z* namespace for custom code)
- Include comprehensive error handling in all code
- Add authorization checks to all function modules
- Make code transaction-safe with COMMIT WORK / ROLLBACK WORK
- Document complex logic with clear comments
- Generate complete, production-ready code
- Validate all generated code before saving
- Create detailed documentation and deployment guides

WORKFLOW:
1. Analyze SAP configuration thoroughly
2. Generate all code files
3. Validate each file
4. Create comprehensive tests
5. Write detailed deployment documentation

All code must be production-ready and follow SAP best practices.
        `,
      },

      // Auto-accept file edits to output directory
      permissionMode: 'acceptEdits',

      // Use the best model
      model: 'claude-sonnet-4-20250514',

      // Allow enough turns for complex generation
      maxTurns: 50,

      // Enable thinking for better code generation
      maxThinkingTokens: 10000,
    },
  });

  // Stream results and collect messages
  const messages: any[] = [];
  let finalResult: any = null;

  for await (const message of result) {
    messages.push(message);

    if (message.type === 'assistant') {
      // Log assistant messages
      console.log(
        '\n[Assistant]:',
        message.message.content
          .map((c: any) => (c.type === 'text' ? c.text : `[${c.type}]`))
          .join(' ')
      );
    } else if (message.type === 'result') {
      finalResult = message;
      console.log('\n' + '='.repeat(70));
      console.log('GENERATION COMPLETE');
      console.log('='.repeat(70));
      console.log(`Status: ${message.subtype || 'completed'}`);
      console.log(`Cost: $${message.total_cost_usd.toFixed(4)}`);
      console.log(`Duration: ${(message.duration_ms / 1000).toFixed(2)}s`);
      console.log('='.repeat(70));
    }
  }

  console.log(`
✅ Code generation complete!

Generated files saved to: ${customerDir}

Next steps:
1. Review the generated code
2. Check the DEPLOYMENT_GUIDE.md for deployment instructions
3. Run the tests to verify the code
4. Deploy to your SAP system

For support or issues, please contact the development team.
`);

  return { messages, result: finalResult };
}

/**
 * Build the main prompt for the orchestrator agent
 */
function buildMainPrompt(request: GenerateEndpointRequest): string {
  const customFieldsDesc = request.requirements.customFields
    ? Object.entries(request.requirements.customFields)
        .map(([field, desc]) => `  - ${field}: ${desc}`)
        .join('\n')
    : '  (None specified)';

  return `
Generate a complete SAP quote creation endpoint for ${request.customerName.toUpperCase()}.

SAP VERSION: ${request.sapVersion}

CONFIGURATION FILES:
${request.configFiles.map((f) => `- ${f}`).join('\n')}

REQUIREMENTS:

Quote Fields Required:
${request.requirements.quoteFields.map((f) => `  - ${f}`).join('\n')}

Custom Fields:
${customFieldsDesc}

Special Logic:
${request.requirements.specialLogic || '(None specified)'}

DELIVERABLES:

Please generate the following files and save them to ./output/${request.customerName}/:

1. analysis.json - Complete SAP system analysis
2. Z_CREATE_QUOTE_${request.customerName.toUpperCase()}.abap - Function module
3. Z${request.customerName.toUpperCase()}_QUOTE_SRV.xml - OData service definition
4. ZCL_${request.customerName.toUpperCase()}_QUOTE_DPC_EXT.abap - Data provider class
5. ZCL_${request.customerName.toUpperCase()}_QUOTE_MPC_EXT.abap - Model provider class
6. tests/Z_CREATE_QUOTE_${request.customerName.toUpperCase()}_TEST.abap - Unit tests
7. tests/integration_tests.md - Integration test scenarios
8. tests/${request.customerName}_quote_api_tests.json - Postman collection
9. DEPLOYMENT_GUIDE.md - Complete deployment guide

PROCESS:

Step 1: ANALYZE SAP CONFIGURATION
- Use the Task tool to delegate to the 'sap-context' agent
- Task: "Analyze SAP configuration files and extract all customizations"
- The agent should use the extract_sap_customizations and parse_sap_table tools
- Save results to ./output/${request.customerName}/analysis.json

Step 2: GENERATE ABAP CODE
- Use the Task tool to delegate to the 'abap-generator' agent
- Task: "Generate ABAP function module and OData service code"
- The agent should:
  * Read analysis.json
  * Read templates from src/templates/
  * Generate all ABAP code files
  * Validate each file with validate_abap_syntax tool
  * Fix any validation errors

Step 3: GENERATE TESTS
- Use the Task tool to delegate to the 'test-generator' agent
- Task: "Create comprehensive tests for the quote endpoint"
- The agent should create:
  * ABAP unit tests
  * Integration test scenarios
  * Postman collection

Step 4: CREATE DEPLOYMENT GUIDE
- Use the Task tool to delegate to the 'deployment-guide' agent
- Task: "Create step-by-step deployment documentation"
- The guide should be detailed enough for an SAP admin to follow

All code must be production-ready, validated, and thoroughly documented.
`;
}

/**
 * Example usage
 */
export async function main() {
  const request: GenerateEndpointRequest = {
    customerName: 'asklio',
    sapVersion: 'ECC6',
    configFiles: [
      './examples/sample-sap-config/VBAK_structure.txt',
      './examples/sample-sap-config/VBAP_structure.txt',
      './examples/sample-sap-config/custom_fields.txt',
    ],
    requirements: {
      quoteFields: [
        'customer_id',
        'quote_date',
        'valid_until',
        'line_items',
        'total_amount',
        'currency',
      ],
      customFields: {
        ZZPRIORITY: 'Priority level (1-5)',
        ZZREFERRAL: 'Referral source',
      },
      specialLogic: 'Apply automatic discount based on customer tier',
    },
  };

  await generateQuoteEndpoint(request);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
