/**
 * SAP Endpoint Generator - Main Entry Point
 * Generates SAP ABAP code for OData endpoints using Claude Agent SDK V2
 */

import {
  unstable_v2_createSession,
  unstable_v2_resumeSession,
} from '@anthropic-ai/claude-agent-sdk';
import { GenerateEndpointRequest } from './types';
import { sapContextAgent } from './agents/context-analyzer';
import { abapCodeGenerator } from './agents/code-generator';
import { testGenerator } from './agents/test-generator';
import { deploymentGuide } from './agents/deployment-guide';
import * as path from 'path';
import * as fs from 'fs';
import {
  createSapMcpServer,
  SAP_MCP_ALLOWED_TOOL_NAMES,
  SAP_MCP_SERVER_NAME,
} from './mcp-server/server';

/**
 * Generate a complete SAP quote creation endpoint
 */
export async function generateQuoteEndpoint(
  request: GenerateEndpointRequest
): Promise<{ messages: any[]; result: any; sessionId?: string }> {
  const outputDir = request.outputDir || './output';

  // Sanitize customer name to prevent path traversal attacks
  const safeCustomerName = path.basename(request.customerName);
  if (safeCustomerName !== request.customerName || /[\/\\]/.test(request.customerName)) {
    throw new Error(`Invalid customer name: ${request.customerName} (path traversal attempt detected)`);
  }

  const customerDir = path.join(outputDir, safeCustomerName);
  const sapMcpServer = createSapMcpServer();
  const allowedTools = [
    'Read',
    'Write',
    'Edit',
    'Grep',
    'Glob',
    'Bash',
    'Task',
    ...SAP_MCP_ALLOWED_TOOL_NAMES,
  ];

  // Ensure output directory exists
  if (!fs.existsSync(customerDir)) {
    fs.mkdirSync(customerDir, { recursive: true });
  }

  // Build the main prompt
  const prompt = buildMainPrompt(request, outputDir, safeCustomerName);

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     SAP Endpoint Generator - Powered by Claude Agent SDK V2    ║
╚════════════════════════════════════════════════════════════════╝

Customer: ${safeCustomerName}
SAP Version: ${request.sapVersion}
Output Directory: ${customerDir}

Starting code generation...
`);

  // Session options for V2 API
  const sessionOptions = {
    cwd: process.cwd(),

    // Load ABAP templates from project
    settingSources: ['project'] as const,

    // Register all specialized agents
    agents: {
      'sap-context': sapContextAgent,
      'abap-generator': abapCodeGenerator,
      'test-generator': testGenerator,
      'deployment-guide': deploymentGuide,
    },

    // Allow all necessary tools
    allowedTools,

    // Register SAP-specific MCP tools
    mcpServers: {
      [SAP_MCP_SERVER_NAME]: sapMcpServer,
    },

    // Use Claude Code system prompt for best file handling
    systemPrompt: {
      type: 'preset' as const,
      preset: 'claude_code' as const,
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
    permissionMode: 'acceptEdits' as const,

    // Use the best model
    model: 'claude-sonnet-4-5' as const,

    // Allow enough turns for complex generation
    maxTurns: 50,

    // Enable thinking for better code generation
    maxThinkingTokens: 10000,
  };

  // Create or resume session using V2 API
  // Note: V2 uses 'await using' for automatic cleanup, but we need manual handling
  // for session persistence across the function
  let session: Awaited<ReturnType<typeof unstable_v2_createSession>>;

  if (request.resume) {
    // Resume existing session
    session = await unstable_v2_resumeSession(request.resume, sessionOptions);
    console.log(`\n📋 Resuming Session: ${request.resume}`);
  } else {
    // Create new session
    session = await unstable_v2_createSession(sessionOptions);
  }

  // Stream results and collect messages
  const messages: any[] = [];
  let finalResult: any = null;
  let sessionId: string | undefined;

  try {
    // Send the prompt to the session
    await session.send(prompt);

    // Receive and process messages
    for await (const message of session.receive()) {
      messages.push(message);

      // Capture session ID from init message
      if (message.type === 'system' && message.subtype === 'init') {
        sessionId = message.session_id;
        console.log(`\n📋 Session ID: ${sessionId}`);
        console.log('   (Save this ID to resume the session later)\n');
      }

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
        if (sessionId) {
          console.log(`Session ID: ${sessionId}`);
        }
        console.log('='.repeat(70));
      }
    }
  } finally {
    // Cleanup session (V2 sessions support Symbol.asyncDispose)
    if (session && typeof (session as any)[Symbol.asyncDispose] === 'function') {
      await (session as any)[Symbol.asyncDispose]();
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

  return { messages, result: finalResult, sessionId };
}

/**
 * Build the main prompt for the orchestrator agent
 */
function buildMainPrompt(
  request: GenerateEndpointRequest,
  outputDir: string,
  safeCustomerName: string
): string {
  const customFieldsDesc = request.requirements.customFields
    ? Object.entries(request.requirements.customFields)
        .map(([field, desc]) => `  - ${field}: ${desc}`)
        .join('\n')
    : '  (None specified)';

  return `
Generate a complete SAP quote creation endpoint for ${safeCustomerName.toUpperCase()}.

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

Please generate the following files and save them to ${outputDir}/${safeCustomerName}/:

1. analysis.json - Complete SAP system analysis
2. Z_CREATE_QUOTE_${safeCustomerName.toUpperCase()}.abap - Function module
3. Z${safeCustomerName.toUpperCase()}_QUOTE_SRV.xml - OData service definition
4. ZCL_${safeCustomerName.toUpperCase()}_QUOTE_DPC_EXT.abap - Data provider class
5. ZCL_${safeCustomerName.toUpperCase()}_QUOTE_MPC_EXT.abap - Model provider class
6. tests/Z_CREATE_QUOTE_${safeCustomerName.toUpperCase()}_TEST.abap - Unit tests
7. tests/integration_tests.md - Integration test scenarios
8. tests/${safeCustomerName}_quote_api_tests.json - Postman collection
9. DEPLOYMENT_GUIDE.md - Complete deployment guide

PROCESS:

Step 1: ANALYZE SAP CONFIGURATION
- Use the Task tool to delegate to the 'sap-context' agent
- Task: "Analyze SAP configuration files and extract all customizations"
- The agent should use the extract_sap_customizations and parse_sap_table tools
- Save results to ${outputDir}/${safeCustomerName}/analysis.json

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
