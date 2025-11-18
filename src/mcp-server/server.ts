/**
 * MCP Server for SAP tools
 * Provides tools for analyzing SAP systems and validating generated code
 */

import { createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { parseSapTableTool } from './tools/parse-table';
import { validateAbapSyntax } from './tools/validate-abap';
import { generateODataMetadata } from './tools/generate-metadata';
import { extractCustomizations } from './tools/extract-customizations';

export const SAP_MCP_SERVER_NAME = 'sap-tools';
const SAP_MCP_VERSION = '1.0.0';

const SAP_MCP_TOOLS = [
  parseSapTableTool,
  validateAbapSyntax,
  generateODataMetadata,
  extractCustomizations,
];

export const SAP_MCP_ALLOWED_TOOL_NAMES = SAP_MCP_TOOLS.map(
  (tool) => `mcp__${SAP_MCP_SERVER_NAME}__${tool.name}`
);

/**
 * Create and configure the SAP MCP server using the Agent SDK helper
 */
export function createSapMcpServer() {
  return createSdkMcpServer({
    name: SAP_MCP_SERVER_NAME,
    version: SAP_MCP_VERSION,
    tools: SAP_MCP_TOOLS,
  });
}

/**
 * Start the MCP server over stdio (useful for manual debugging)
 */
export async function startMcpServer() {
  const serverConfig = createSapMcpServer();
  const transport = new StdioServerTransport();

  await serverConfig.instance.connect(transport);

  console.error('SAP MCP Server running on stdio');
}

// Start server if run directly
if (require.main === module) {
  startMcpServer().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}
