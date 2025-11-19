/**
 * CLI Integration Tests - Custom Fields and Special Logic
 *
 * Tests for custom Z* fields and special business logic
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
  console.log('\n⚠️  Skipping custom fields tests - ANTHROPIC_API_KEY not set');
  console.log('   To run: export ANTHROPIC_API_KEY=your-key');
  console.log('   npm test tests/cli-integration/custom-fields.test.ts\n');
}

describeIfApiKey('CLI Integration - Custom Fields and Special Logic', () => {
  let config: TestConfig;

  beforeAll(() => {
    config = setupTestEnvironment();
    buildProject();
  });

  afterAll(() => {
    cleanupTestEnvironment(config.tempDir);
  });

  describe('Custom Z Fields', () => {
    it(
      'should generate with custom Z fields',
      async () => {
        const configFile = createConfigFile(
          config.tempDir,
          'VBAK_custom.txt',
          SAP_TABLE_CONFIGS.VBAK_CUSTOM
        );

        const customerName = 'test-custom-fields';
        const customerOutput = path.join(config.outputDir, customerName);

        const command = buildQuoteCommand({
          customerName,
          sapVersion: 'ECC6',
          configFiles: configFile,
          fields: ['customer_id', 'quote_date', 'total_amount'],
          outputDir: config.outputDir,
          customFields: {
            ZZPRIORITY: 'Priority level',
            ZZREFERRAL: 'Referral source',
            ZZDISCOUNT: 'Discount %',
          },
        });

        await executeCLIWithRetry(command, {
          testName: `Custom fields generation for ${customerName}`,
        });

        verifyOutputDirectory(customerOutput);
        const files = verifyFilesGenerated(customerOutput, 5);

        // Check if custom fields are mentioned in generated code
        const abapFiles = files.filter((f) => f.endsWith('.abap'));
        expect(abapFiles.length).toBeGreaterThan(0);

        console.log(`✅ Generated ${files.length} files with custom fields`);
      },
      2500000 // 41+ minutes timeout
    );
  });

  describe('Special Business Logic', () => {
    it(
      'should generate with special business logic',
      async () => {
        const configFile = createConfigFile(
          config.tempDir,
          'VBAK_logic.txt',
          SAP_TABLE_CONFIGS.VBAK_LOGIC
        );

        const customerName = 'test-special-logic';
        const customerOutput = path.join(config.outputDir, customerName);

        const command = buildQuoteCommand({
          customerName,
          sapVersion: 'ECC6',
          configFiles: configFile,
          fields: ['customer_id', 'quote_date', 'total_amount'],
          outputDir: config.outputDir,
          specialLogic: "Automatically apply 15% discount for VIP customers (ZZTYPE='V')",
        });

        await executeCLIWithRetry(command, {
          testName: `Special logic generation for ${customerName}`,
        });

        verifyOutputDirectory(customerOutput);
        verifyFilesGenerated(customerOutput, 5);
      },
      2500000 // 41+ minutes timeout
    );
  });
});
