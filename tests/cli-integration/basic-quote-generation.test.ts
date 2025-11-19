/**
 * CLI Integration Tests - Basic Quote Generation
 *
 * Tests for different SAP versions (R3, ECC6, S4HANA)
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
  console.log('\n⚠️  Skipping basic quote generation tests - ANTHROPIC_API_KEY not set');
  console.log('   To run: export ANTHROPIC_API_KEY=your-key');
  console.log('   npm test tests/cli-integration/basic-quote-generation.test.ts\n');
}

describeIfApiKey('CLI Integration - Basic Quote Generation', () => {
  let config: TestConfig;

  beforeAll(() => {
    config = setupTestEnvironment();
    buildProject();
  });

  afterAll(() => {
    cleanupTestEnvironment(config.tempDir);
  });

  describe('ECC6 System', () => {
    it(
      'should generate quote endpoint for ECC6 system',
      async () => {
        const configFile = createConfigFile(
          config.tempDir,
          'VBAK_ecc6.txt',
          SAP_TABLE_CONFIGS.VBAK_ECC6
        );

        const customerName = 'test-ecc6-customer';
        const customerOutput = path.join(config.outputDir, customerName);

        const command = buildQuoteCommand({
          customerName,
          sapVersion: 'ECC6',
          configFiles: configFile,
          fields: ['customer_id', 'quote_date', 'total_amount'],
          outputDir: config.outputDir,
        });

        await executeCLIWithRetry(command, {
          testName: `ECC6 generation for ${customerName}`,
        });

        verifyOutputDirectory(customerOutput);
        verifyFilesGenerated(customerOutput, 5);
      },
      2500000 // 41+ minutes timeout
    );
  });

  describe('S4HANA System', () => {
    it(
      'should generate quote endpoint for S4HANA system',
      async () => {
        const configFile = createConfigFile(
          config.tempDir,
          'VBAK_s4hana.txt',
          SAP_TABLE_CONFIGS.VBAK_S4HANA
        );

        const customerName = 'test-s4hana-customer';
        const customerOutput = path.join(config.outputDir, customerName);

        const command = buildQuoteCommand({
          customerName,
          sapVersion: 'S4HANA',
          configFiles: configFile,
          fields: ['customer_id', 'quote_date', 'total_amount', 'currency'],
          outputDir: config.outputDir,
        });

        await executeCLIWithRetry(command, {
          testName: `S/4HANA generation for ${customerName}`,
        });

        verifyOutputDirectory(customerOutput);
        verifyFilesGenerated(customerOutput, 5);
      },
      2500000 // 41+ minutes timeout
    );
  });

  describe('R3 System', () => {
    it(
      'should generate quote endpoint for R3 system',
      async () => {
        const configFile = createConfigFile(
          config.tempDir,
          'VBAK_r3.txt',
          SAP_TABLE_CONFIGS.VBAK_R3
        );

        const customerName = 'test-r3-customer';
        const customerOutput = path.join(config.outputDir, customerName);

        const command = buildQuoteCommand({
          customerName,
          sapVersion: 'R3',
          configFiles: configFile,
          fields: ['customer_id', 'quote_date', 'total_amount'],
          outputDir: config.outputDir,
        });

        await executeCLIWithRetry(command, {
          testName: `R/3 generation for ${customerName}`,
        });

        verifyOutputDirectory(customerOutput);
        verifyFilesGenerated(customerOutput, 5);
      },
      2500000 // 41+ minutes timeout
    );
  });
});
