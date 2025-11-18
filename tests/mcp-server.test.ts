/**
 * Tests for MCP Server
 */

import { createSapMcpServer, startMcpServer } from '../src/mcp-server/server';

describe('MCP Server', () => {
  it('should create server successfully', async () => {
    const server = await createSapMcpServer();
    expect(server).toBeDefined();
  });

  it('should export startMcpServer function', () => {
    expect(typeof startMcpServer).toBe('function');
  });
});
