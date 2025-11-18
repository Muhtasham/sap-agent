/**
 * Streaming utilities for real-time progress updates
 * Enables Server-Sent Events (SSE) for live agent feedback
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
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

export interface ProgressUpdate {
  type: 'init' | 'progress' | 'agent' | 'tool' | 'file' | 'complete' | 'error';
  message: string;
  agent?: string;
  tool?: string;
  file?: string;
  sessionId?: string;
  data?: any;
}

/**
 * Build the main prompt for the orchestrator agent
 */
function buildMainPrompt(request: GenerateEndpointRequest, outputDir: string): string {
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

Please generate the following files and save them to ${outputDir}/${request.customerName}/:

1. Function Module: Z_CREATE_QUOTE_${request.customerName.toUpperCase()}.abap
2. OData Service: Z${request.customerName.toUpperCase()}_QUOTE_SRV.xml
3. DPC Class: ZCL_${request.customerName.toUpperCase()}_QUOTE_DPC_EXT.abap
4. MPC Class: ZCL_${request.customerName.toUpperCase()}_QUOTE_MPC_EXT.abap
5. Deployment Guide: DEPLOYMENT_GUIDE.md
6. Tests: tests/Z_CREATE_QUOTE_${request.customerName.toUpperCase()}_TEST.abap

Follow SAP best practices and make all code production-ready.
`;
}

/**
 * Generate quote endpoint with streaming progress updates
 */
export async function* generateQuoteEndpointStreaming(
  request: GenerateEndpointRequest
): AsyncGenerator<ProgressUpdate> {
  const outputDir = request.outputDir || './output';
  const customerDir = path.join(outputDir, request.customerName);
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

  yield {
    type: 'init',
    message: `Starting SAP endpoint generation for ${request.customerName}`,
  };

  // Build the main prompt
  const prompt = buildMainPrompt(request, outputDir);

  // Create streaming input generator
  // Note: SDK expects full SDKUserMessage objects in streaming mode
  async function* generateMessages() {
    yield {
      type: 'user' as const,
      session_id: request.resume ?? '',
      message: {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: prompt,
          },
        ],
      },
      parent_tool_use_id: null,
    };
  }

  let sessionId: string | undefined;
  let currentAgent: string | undefined;

  try {
    // Start query with streaming input
    // Type assertion: SDK docs show this simplified format works at runtime
    const result = query({
      prompt: generateMessages() as any,
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
        allowedTools,

        // Register SAP-specific MCP tools
        mcpServers: {
          [SAP_MCP_SERVER_NAME]: sapMcpServer,
        },

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
        model: 'claude-sonnet-4-5',

        // Allow enough turns for complex generation
        maxTurns: 50,

        // Enable thinking for better code generation
        maxThinkingTokens: 10000,

        // Session management
        ...(request.resume && {
          resume: request.resume,
          forkSession: request.forkSession ?? false,
        }),
      },
    });

    // Stream results and emit progress updates
    for await (const message of result) {
      // Capture session ID
      if (message.type === 'system' && message.subtype === 'init') {
        sessionId = message.session_id;
        yield {
          type: 'progress',
          message: 'Session initialized',
          sessionId: message.session_id,
        };
      }

      // Track agent activity
      if (message.type === 'assistant') {
        const content = message.message.content;

        // Extract agent activity from messages
        for (const block of content) {
          if (block.type === 'text') {
            const text = block.text;

            // Detect agent delegation
            if (text.includes('Task') || text.includes('delegate')) {
              if (text.includes('sap-context')) {
                currentAgent = 'Context Analyzer';
                yield {
                  type: 'agent',
                  agent: currentAgent,
                  message: 'Analyzing SAP configuration and requirements',
                };
              } else if (text.includes('abap-generator')) {
                currentAgent = 'Code Generator';
                yield {
                  type: 'agent',
                  agent: currentAgent,
                  message: 'Generating production-ready ABAP code',
                };
              } else if (text.includes('test-generator')) {
                currentAgent = 'Test Generator';
                yield {
                  type: 'agent',
                  agent: currentAgent,
                  message: 'Creating comprehensive test suite',
                };
              } else if (text.includes('deployment-guide')) {
                currentAgent = 'Deployment Guide';
                yield {
                  type: 'agent',
                  agent: currentAgent,
                  message: 'Writing step-by-step deployment documentation',
                };
              }
            }

            // Detect file operations
            if (text.includes('Write') || text.includes('Edit')) {
              const fileMatch = text.match(/(['"`])([^'"`]+\.(?:abap|xml|md|json))(['"`])/);
              if (fileMatch) {
                yield {
                  type: 'file',
                  file: fileMatch[2],
                  message: `Creating ${fileMatch[2]}`,
                  agent: currentAgent,
                };
              }
            }

            // Detect tool usage
            if (text.includes('parse_sap_table')) {
              yield {
                type: 'tool',
                tool: 'parse_sap_table',
                message: 'Parsing SAP table structures',
                agent: currentAgent,
              };
            } else if (text.includes('validate_abap_syntax')) {
              yield {
                type: 'tool',
                tool: 'validate_abap_syntax',
                message: 'Validating ABAP code syntax',
                agent: currentAgent,
              };
            } else if (text.includes('generate_odata_metadata')) {
              yield {
                type: 'tool',
                tool: 'generate_odata_metadata',
                message: 'Generating OData service metadata',
                agent: currentAgent,
              };
            } else if (text.includes('extract_sap_customizations')) {
              yield {
                type: 'tool',
                tool: 'extract_sap_customizations',
                message: 'Extracting SAP customizations',
                agent: currentAgent,
              };
            }
          }
        }
      }

      // Final result
      if (message.type === 'result') {
        yield {
          type: 'progress',
          message: 'Generation complete',
          data: {
            status: message.subtype || 'completed',
            cost: message.total_cost_usd,
            duration: message.duration_ms,
          },
        };
      }
    }

    // Get generated files
    const files: string[] = [];
    if (fs.existsSync(customerDir)) {
      const walk = (dir: string) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
          } else {
            files.push(path.relative(outputDir, fullPath));
          }
        }
      };
      walk(customerDir);
    }

    yield {
      type: 'complete',
      message: `Successfully generated ${files.length} files`,
      sessionId,
      data: {
        files,
        customer: request.customerName,
      },
    };
  } catch (error: any) {
    yield {
      type: 'error',
      message: error.message,
      data: {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    };
  }
}
