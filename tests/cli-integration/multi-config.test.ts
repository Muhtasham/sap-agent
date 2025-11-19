/**
 * CLI Integration Tests - Multiple Configuration Files
 *
 * Tests for multiple SAP table configurations (header + items)
 *
 * Note: These tests call the real Anthropic API (manual execution only)
 */

import * as path from 'path';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  buildProject,
  executeCLIWithRetry,
  createConfigFile,
  verifyOutputDirectory,
  verifyFilesGenerated,
  buildQuoteCommand,
  SAP_TABLE_CONFIGS,
  type TestConfig,
} from './test-utils';

// Integration tests require API key
const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
const describeIfApiKey = hasApiKey ? describe : describe.skip;

if (!hasApiKey) {
  console.log('\n⚠️  Skipping multi-config tests - ANTHROPIC_API_KEY not set');
  console.log('   To run: export ANTHROPIC_API_KEY=your-key');
  console.log('   npm test tests/cli-integration/multi-config.test.ts\n');
}

describeIfApiKey('CLI Integration - Multiple Configuration Files', () => {
  let config: TestConfig;

  beforeAll(() => {
    config = setupTestEnvironment();
    buildProject();
  });

  afterAll(() => {
    cleanupTestEnvironment(config.tempDir);
  });

  it(
    'should generate with multiple SAP table configs',
    async () => {
      // Create VBAK (header) config
      const vbakFile = createConfigFile(
        config.tempDir,
        'VBAK.txt',
        SAP_TABLE_CONFIGS.VBAK_HEADER
      );

      // Create VBAP (item) config
      const vbapFile = createConfigFile(
        config.tempDir,
        'VBAP.txt',
        SAP_TABLE_CONFIGS.VBAP_ITEM
      );

      const customerName = 'test-multi-config';
      const customerOutput = path.join(config.outputDir, customerName);

      const command = buildQuoteCommand({
        customerName,
        sapVersion: 'ECC6',
        configFiles: [vbakFile, vbapFile],
        fields: ['customer_id', 'quote_date', 'total_amount', 'items'],
        outputDir: config.outputDir,
      });

      await executeCLIWithRetry(command, {
        testName: `Multi-config generation for ${customerName}`,
      });

      verifyOutputDirectory(customerOutput);
      verifyFilesGenerated(customerOutput, 5);
    },
    2500000 // 41+ minutes timeout
  );
});
