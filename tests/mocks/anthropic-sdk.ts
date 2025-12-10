/**
 * Lightweight Jest mock for @anthropic-ai/claude-agent-sdk
 * Provides minimal implementations for V1 and V2 APIs
 * so that unit tests can run without the real SDK (which is ESM-only).
 */

type ToolDefinition<Schema> = {
  name: string;
  description: string;
  inputSchema: Schema;
  handler: (args: any, extra: unknown) => Promise<any>;
};

// ============================================
// V1 API Mocks (Legacy - kept for compatibility)
// ============================================

export function tool<Schema extends Record<string, unknown>>(
  name: string,
  description: string,
  inputSchema: Schema,
  handler: (args: any, extra: unknown) => Promise<any>
): ToolDefinition<Schema> {
  return { name, description, inputSchema, handler };
}

export function createSdkMcpServer(options: {
  name: string;
  version?: string;
  tools?: Array<ToolDefinition<any>>;
}) {
  return {
    type: 'sdk' as const,
    name: options.name,
    instance: {
      connect: async () => {},
      tool: () => {},
    },
  };
}

function createMockMessages() {
  const sessionId = 'mock-session';
  return [
    {
      type: 'system' as const,
      subtype: 'init' as const,
      uuid: 'init-message',
      session_id: sessionId,
      apiKeySource: 'user' as const,
      cwd: process.cwd(),
      tools: [],
      mcp_servers: [],
      model: 'mock',
      permissionMode: 'default' as const,
      slash_commands: [],
      output_style: 'text',
    },
    {
      type: 'assistant' as const,
      uuid: 'assistant-message',
      session_id: sessionId,
      parent_tool_use_id: null,
      message: {
        content: [
          { type: 'text' as const, text: 'Task: delegate to sap-context' },
          { type: 'text' as const, text: 'Write: ./output/mock/Z_FILE.abap' },
          { type: 'text' as const, text: 'Tool: validate_abap_syntax' },
        ],
      },
    },
    {
      type: 'result' as const,
      subtype: 'success' as const,
      uuid: 'result-message',
      session_id: sessionId,
      duration_ms: 100,
      duration_api_ms: 80,
      is_error: false,
      num_turns: 3,
      result: 'completed',
      total_cost_usd: 0,
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
      permission_denials: [],
    },
  ];
}

export function query(_args?: unknown) {
  const messages = createMockMessages();
  async function* generator() {
    for (const message of messages) {
      yield message;
    }
  }
  const iterator = generator();
  return Object.assign(iterator, {
    interrupt: async () => {},
    setPermissionMode: async () => {},
  });
}

// ============================================
// V2 API Mocks (Session-based API)
// ============================================

interface MockSession {
  send: (prompt: string) => Promise<void>;
  receive: () => AsyncGenerator<any>;
  [Symbol.asyncDispose]: () => Promise<void>;
}

function createMockSession(): MockSession {
  const messages = createMockMessages();

  return {
    send: async (_prompt: string) => {
      // Mock send - does nothing in tests
    },
    receive: async function* () {
      for (const message of messages) {
        yield message;
      }
    },
    [Symbol.asyncDispose]: async () => {
      // Mock cleanup
    },
  };
}

/**
 * V2: Create a new session
 */
export async function unstable_v2_createSession(_options?: unknown): Promise<MockSession> {
  return createMockSession();
}

/**
 * V2: Resume an existing session
 */
export async function unstable_v2_resumeSession(
  _sessionId: string,
  _options?: unknown
): Promise<MockSession> {
  return createMockSession();
}

/**
 * V2: One-shot prompt (convenience function)
 */
export async function unstable_v2_prompt(
  _prompt: string,
  _options?: { model?: string }
): Promise<{
  subtype: 'success' | 'error';
  result: string;
  total_cost_usd: number;
}> {
  return {
    subtype: 'success',
    result: 'Mock response',
    total_cost_usd: 0.001,
  };
}

// ============================================
// Common Types and Utilities
// ============================================

export class AbortError extends Error {}

// Type definitions for agent registration
export interface AgentDefinition {
  description: string;
  model?: 'sonnet' | 'opus' | 'haiku';
  prompt: string;
  tools?: string[];
}
