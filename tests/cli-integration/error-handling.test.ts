/**
 * CLI Integration Tests - Error Handling
 *
 * Fast tests for error conditions (no agent execution required)
 *
 * Note: These tests are FAST (<1 second) and can run without manual opt-in
 */

import { execSync } from 'child_process';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  buildProject,
  createConfigFile,
  type TestConfig,
} from './test-utils';

// Integration tests require API key
const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
const describeIfApiKey = hasApiKey ? describe : describe.skip;

if (!hasApiKey) {
  console.log('\n⚠️  Skipping error handling tests - ANTHROPIC_API_KEY not set');
  console.log('   To run: export ANTHROPIC_API_KEY=your-key');
  console.log('   npm test tests/cli-integration/error-handling.test.ts\n');
}

describeIfApiKey('CLI Integration - Error Handling', () => {
  let config: TestConfig;

  beforeAll(() => {
    config = setupTestEnvironment();
    buildProject();
  });

  afterAll(() => {
    cleanupTestEnvironment(config.tempDir);
  });

  it('should fail gracefully with invalid SAP version', () => {
    const configFile = createConfigFile(
      config.tempDir,
      'VBAK_error.txt',
      'Table: VBAK\nField MANDT CLNT 3 Client'
    );

    const command = `node dist/cli.js quote \\
      --customer test-invalid \\
      --sap-version INVALID \\
      --config-files ${configFile} \\
      --fields customer_id \\
      --output ${config.outputDir}`;

    console.log('\n🧪 Testing invalid SAP version error handling...');

    expect(() => {
      execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    }).toThrow();

    console.log('✅ Correctly rejected invalid SAP version');
  });

  it('should fail gracefully with missing config files', () => {
    const command = `node dist/cli.js quote \\
      --customer test-missing \\
      --sap-version ECC6 \\
      --config-files /nonexistent/file.txt \\
      --fields customer_id \\
      --output ${config.outputDir}`;

    console.log('\n🧪 Testing missing config file error handling...');

    expect(() => {
      execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    }).toThrow();

    console.log('✅ Correctly rejected missing config file');
  });

  it('should fail gracefully with missing required fields', () => {
    const configFile = createConfigFile(
      config.tempDir,
      'VBAK_minimal.txt',
      'Table: VBAK\nField MANDT CLNT 3 Client'
    );

    const command = `node dist/cli.js quote \\
      --customer test-no-fields \\
      --sap-version ECC6 \\
      --config-files ${configFile} \\
      --output ${config.outputDir}`;

    console.log('\n🧪 Testing missing required fields error handling...');

    expect(() => {
      execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    }).toThrow();

    console.log('✅ Correctly rejected missing required fields');
  });
});
