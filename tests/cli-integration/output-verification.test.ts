/**
 * CLI Integration Tests - Output Verification
 *
 * Tests to verify all expected file types are generated
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
  verifyFileTypes,
  buildQuoteCommand,
  SAP_TABLE_CONFIGS,
  type TestConfig,
} from './test-utils';

// Integration tests require API key
const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
const describeIfApiKey = hasApiKey ? describe : describe.skip;

if (!hasApiKey) {
  console.log('\n⚠️  Skipping output verification tests - ANTHROPIC_API_KEY not set');
  console.log('   To run: export ANTHROPIC_API_KEY=your-key');
  console.log('   npm test tests/cli-integration/output-verification.test.ts\n');
}

describeIfApiKey('CLI Integration - Output Verification', () => {
  let config: TestConfig;

  beforeAll(() => {
    config = setupTestEnvironment();
    buildProject();
  });

  afterAll(() => {
    cleanupTestEnvironment(config.tempDir);
  });

  it(
    'should generate all expected file types',
    async () => {
      const configFile = createConfigFile(
        config.tempDir,
        'VBAK_complete.txt',
        SAP_TABLE_CONFIGS.VBAK_COMPLETE
      );

      const customerName = 'test-complete-output';
      const customerOutput = path.join(config.outputDir, customerName);

      const command = buildQuoteCommand({
        customerName,
        sapVersion: 'ECC6',
        configFiles: configFile,
        fields: ['customer_id', 'quote_date', 'total_amount'],
        outputDir: config.outputDir,
      });

      await executeCLIWithRetry(command, {
        testName: `Complete output verification for ${customerName}`,
      });

      verifyOutputDirectory(customerOutput);
      const files = verifyFilesGenerated(customerOutput, 5);

      console.log(`\nGenerated files (${files.length}):`);
      files.forEach((f) => console.log(`  - ${f}`));

      // Verify expected file types exist
      verifyFileTypes(files, [
        { extension: '.abap', name: 'ABAP' },
        { extension: '.xml', name: 'XML' },
        { extension: '.md', name: 'Markdown documentation' },
        { extension: '.json', name: 'JSON analysis' },
      ]);

      console.log(`\n✅ Complete output verification passed`);
    },
    2500000 // 41+ minutes timeout
  );
});
