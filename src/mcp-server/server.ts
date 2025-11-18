/**
 * MCP Server for SAP tools
 * Provides tools for analyzing SAP systems and validating generated code
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { parseSapTableTool } from './tools/parse-table';
import { validateAbapSyntax } from './tools/validate-abap';
import { generateODataMetadata } from './tools/generate-metadata';
import { extractCustomizations } from './tools/extract-customizations';

/**
 * Create and configure the SAP MCP server
 */
export async function createSapMcpServer() {
  const server = new Server(
    {
      name: 'sap-tools',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all SAP tools
  const tools = [
    parseSapTableTool,
    validateAbapSyntax,
    generateODataMetadata,
    extractCustomizations,
  ];

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.parameters,
      })),
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const tool = tools.find((t) => t.name === toolName);

    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    try {
      const result = await tool.handler(request.params.arguments || {}, {});
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: `Tool execution failed: ${toolName}`,
              message: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start the MCP server
 */
export async function startMcpServer() {
  const server = await createSapMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error('SAP MCP Server running on stdio');
}

// Start server if run directly
if (require.main === module) {
  startMcpServer().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}
