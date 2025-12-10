/**
 * Programmatic Usage Example
 * Demonstrates how to use the generator programmatically using Claude Agent SDK V2
 */

import {
  unstable_v2_createSession,
  unstable_v2_prompt,
} from '@anthropic-ai/claude-agent-sdk';
import {
  sapContextAgent,
  abapCodeGenerator,
  testGenerator,
  deploymentGuide
} from '../src/agents';
import {
  createSapMcpServer,
  SAP_MCP_ALLOWED_TOOL_NAMES,
  SAP_MCP_SERVER_NAME
} from '../src/mcp-server/server';

async function programmaticExample() {
  console.log('=== Programmatic SAP Endpoint Generator Example (V2 API) ===\n');

  // Create the MCP server with SAP tools
  const sapTools = createSapMcpServer();

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
    console.log('Starting programmatic generation with V2 Session API...\n');

    let filesGenerated: string[] = [];

    // Session options for V2 API
    const sessionOptions = {
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
        [SAP_MCP_SERVER_NAME]: sapTools
      },

      // Allow necessary tools
      allowedTools: [
        'Read', 'Write', 'Edit', 'Grep', 'Glob', 'Task',
        ...SAP_MCP_ALLOWED_TOOL_NAMES
      ],

      // Configuration
      model: 'claude-sonnet-4-5' as const,
      maxTurns: 30,
      maxThinkingTokens: 10000,

      // System prompt
      systemPrompt: {
        type: 'preset' as const,
        preset: 'claude_code' as const,
        append: `
You are an expert SAP ABAP developer. Generate production-ready code with:
- Transaction safety (COMMIT/ROLLBACK)
- Authorization checks
- Comprehensive error handling
- SAP naming conventions (Z* namespace)
        `
      }
    };

    // Create session using V2 API
    const session = await unstable_v2_createSession(sessionOptions);

    try {
      // Send the prompt to the session
      await session.send(generationTask);

      // Receive and process messages
      for await (const message of session.receive()) {
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
    } finally {
      // Cleanup session (V2 sessions support Symbol.asyncDispose)
      if (typeof (session as any)[Symbol.asyncDispose] === 'function') {
        await (session as any)[Symbol.asyncDispose]();
      }
    }

  } catch (error) {
    console.error('❌ Error during programmatic generation:', error);
    throw error;
  }
}

/**
 * One-shot example using unstable_v2_prompt
 * Useful for quick, single-turn interactions
 */
async function oneShotExample() {
  console.log('\n=== One-Shot Example (V2 unstable_v2_prompt) ===\n');

  try {
    const result = await unstable_v2_prompt(
      'What is the capital of France? One word only.',
      { model: 'sonnet' }
    );

    if (result.subtype === 'success') {
      console.log(`Answer: ${result.result}`);
      console.log(`Cost: $${result.total_cost_usd.toFixed(4)}`);
    } else {
      console.log('Error:', result.result);
    }
  } catch (error) {
    console.error('❌ Error during one-shot example:', error);
  }
}

/**
 * Multi-turn conversation example
 * Demonstrates the key advantage of V2's session-based API
 */
async function multiTurnExample() {
  console.log('\n=== Multi-Turn Conversation Example ===\n');

  const session = await unstable_v2_createSession({ model: 'sonnet' });

  try {
    // Turn 1
    await session.send('What is 5 + 3? Just the number.');
    for await (const msg of session.receive()) {
      if (msg.type === 'assistant') {
        const text = msg.message.content.find(
          (c): c is { type: 'text'; text: string } => c.type === 'text'
        );
        console.log(`Turn 1: ${text?.text}`);
      }
    }

    // Turn 2 - Claude remembers context
    await session.send('Multiply that by 2. Just the number.');
    for await (const msg of session.receive()) {
      if (msg.type === 'assistant') {
        const text = msg.message.content.find(
          (c): c is { type: 'text'; text: string } => c.type === 'text'
        );
        console.log(`Turn 2: ${text?.text}`);
      }
    }
  } finally {
    // Cleanup session
    if (typeof (session as any)[Symbol.asyncDispose] === 'function') {
      await (session as any)[Symbol.asyncDispose]();
    }
  }
}

// Run the example
if (require.main === module) {
  const example = process.argv[2] || 'main';

  switch (example) {
    case 'main':
      programmaticExample().catch(console.error);
      break;
    case 'one-shot':
      oneShotExample().catch(console.error);
      break;
    case 'multi-turn':
      multiTurnExample().catch(console.error);
      break;
    default:
      console.log('Usage: npx ts-node examples/programmatic-usage.ts [main|one-shot|multi-turn]');
  }
}

export { programmaticExample, oneShotExample, multiTurnExample };
