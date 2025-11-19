/**
 * Tests for MCP Server
 */

import { createSapMcpServer, startMcpServer, SAP_MCP_SERVER_NAME } from '../src/mcp-server/server';

describe('MCP Server', () => {
  it('should create server config with SDK type', () => {
    const serverConfig = createSapMcpServer();
    expect(serverConfig).toBeDefined();
    expect(serverConfig.type).toBe('sdk');
    expect(serverConfig.name).toBe(SAP_MCP_SERVER_NAME);
    expect(serverConfig.instance).toBeDefined();
  });

  it('should export startMcpServer function', () => {
    expect(typeof startMcpServer).toBe('function');
  });
});
