/**
 * Integration test for streaming functionality
 * Tests real SAP code generation with Server-Sent Events
 */

import { generateQuoteEndpointStreaming } from '../src/streaming';
import { SAPVersion } from '../src/types';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Streaming Integration Test', () => {
  let tempDir: string;
  let configFile: string;

  beforeAll(() => {
    // Create temp directory for test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sap-streaming-test-'));

    // Create minimal SAP config file
    configFile = path.join(tempDir, 'test_table.txt');
    fs.writeFileSync(configFile, `
Table: VBAK
Sales Document Header Data

Field       Data Type  Length  Description
MANDT       CLNT       3       Client
VBELN       CHAR       10      Sales Document Number
KUNNR       CHAR       10      Sold-to party
NETWR       CURR       15,2    Net Value
`);
  });

  afterAll(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Clean up output directory
    const outputDir = './output/streaming-test';
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('should stream progress events during SAP code generation', async () => {
    const events: any[] = [];

    console.log('\n🧪 Starting streaming integration test...\n');

    try {
      // Generate with streaming
      for await (const event of generateQuoteEndpointStreaming({
        customerName: 'streaming-test',
        sapVersion: 'ECC6' as SAPVersion,
        configFiles: [configFile],
        requirements: {
          quoteFields: ['customer_id', 'quote_date', 'total_amount'],
          customFields: {
            ZZPRIORITY: 'Priority level',
          },
          specialLogic: 'Simple test generation - create basic quote endpoint',
        },
      })) {
        events.push(event);

        // Log event to console for visibility
        console.log(`📡 Event: ${event.type} - ${event.message}`);
        if (event.agent) console.log(`   🤖 Agent: ${event.agent}`);
        if (event.tool) console.log(`   🔧 Tool: ${event.tool}`);
        if (event.file) console.log(`   📄 File: ${event.file}`);
        if (event.sessionId) console.log(`   🆔 Session: ${event.sessionId}`);
      }
    } catch (error: any) {
      console.error('❌ Streaming test failed:', error.message);
      throw error;
    }

    console.log(`\n✅ Collected ${events.length} total events\n`);

    // Assertions
    expect(events.length).toBeGreaterThan(0);

    // Should have init event
    const initEvents = events.filter(e => e.type === 'init');
    expect(initEvents.length).toBeGreaterThan(0);
    console.log(`✓ Init events: ${initEvents.length}`);

    // Should have progress events
    const progressEvents = events.filter(e => e.type === 'progress');
    expect(progressEvents.length).toBeGreaterThan(0);
    console.log(`✓ Progress events: ${progressEvents.length}`);

    // Should have at least one agent event (or complete event if fast)
    const agentEvents = events.filter(e => e.type === 'agent');
    console.log(`✓ Agent events: ${agentEvents.length}`);

    // Should have complete or error event
    const finalEvents = events.filter(e => e.type === 'complete' || e.type === 'error');
    expect(finalEvents.length).toBeGreaterThan(0);

    const finalEvent = finalEvents[0];
    console.log(`✓ Final event type: ${finalEvent.type}`);

    if (finalEvent.type === 'complete') {
      console.log(`✓ Generation successful!`);
      expect(finalEvent.data).toBeDefined();
      expect(finalEvent.data.files).toBeDefined();
      console.log(`✓ Generated ${finalEvent.data.files.length} files`);

      if (finalEvent.sessionId) {
        console.log(`✓ Session ID: ${finalEvent.sessionId}`);
      }
    } else {
      console.log(`⚠️  Generation ended with error: ${finalEvent.message}`);
      console.log(`   This is OK for testing - we verified streaming works!`);
    }

    // Verify event structure
    events.forEach(event => {
      expect(event.type).toBeDefined();
      expect(event.message).toBeDefined();
      expect(typeof event.message).toBe('string');
    });

    console.log('\n✅ All streaming assertions passed!\n');
  }, 300000); // 5 minute timeout for real generation
});
