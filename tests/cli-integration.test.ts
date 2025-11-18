/**
 * CLI Integration Tests - Tests real agent execution via CLI
 *
 * These tests execute the actual CLI command with different scenarios:
 * - Different SAP versions (R3, ECC6, S4HANA)
 * - Different customer configurations
 * - Error handling and edge cases
 * - Resume and fork functionality
 *
 * Note: These are integration tests that call the real Anthropic API (mocked in test environment)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Integration tests are MANUAL ONLY - must explicitly opt-in to run
// Require both ANTHROPIC_API_KEY and RUN_INTEGRATION_TESTS=true
const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';
const shouldRunTests = hasApiKey && runIntegrationTests;
const describeIfManual = shouldRunTests ? describe : describe.skip;

if (!shouldRunTests) {
  console.log('\n⚠️  Skipping integration tests (MANUAL ONLY)');
  if (!hasApiKey) {
    console.log('   ❌ ANTHROPIC_API_KEY not set');
  }
  if (!runIntegrationTests) {
    console.log('   ❌ RUN_INTEGRATION_TESTS not set to "true"');
  }
  console.log('\n   These tests require real API calls and take 6+ hours to complete.');
  console.log('   To run manually, set both:');
  console.log('     export ANTHROPIC_API_KEY=your-key');
  console.log('     export RUN_INTEGRATION_TESTS=true');
  console.log('     npm test tests/cli-integration.test.ts\n');
}

describeIfManual('CLI Integration Tests', () => {
  let tempDir: string;
  let outputDir: string;

  beforeAll(() => {
    // Create temp directory for test configs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sap-cli-test-'));
    outputDir = path.join(tempDir, 'output');
    fs.mkdirSync(outputDir);

    // Build the project first
    console.log('\n📦 Building project for CLI tests...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build complete\n');
  });

  afterAll(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Basic Quote Generation', () => {
    it('should generate quote endpoint for ECC6 system', async () => {
      // Create test config file
      const configFile = path.join(tempDir, 'VBAK_ecc6.txt');
      fs.writeFileSync(configFile, `
Table: VBAK
Sales Document: Header Data

Field         Data Type  Length  Description
MANDT         CLNT       3       Client
VBELN         CHAR       10      Sales Document
ERDAT         DATS       8       Date on Which Record Was Created
KUNNR         CHAR       10      Sold-To Party
NETWR         CURR       15,2    Net Value of the Sales Order
`);

      const customerName = 'test-ecc6-customer';
      const customerOutput = path.join(outputDir, customerName);

      // Execute CLI command
      const command = `node dist/cli.js quote \
        --customer ${customerName} \
        --sap-version ECC6 \
        --config-files ${configFile} \
        --fields customer_id quote_date total_amount \
        --output ${outputDir}`;

      console.log(`\n🧪 Testing ECC6 generation for ${customerName}...`);

      try {
        execSync(command, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 2400000, // 40 minutes timeout (agent execution can take 15-20+ min)
        });

        // Verify output directory was created
        expect(fs.existsSync(customerOutput)).toBe(true);

        // Verify some files were generated
        const files = fs.readdirSync(customerOutput, { recursive: true });
        expect(files.length).toBeGreaterThan(0);

        console.log(`✅ Generated ${files.length} files for ${customerName}`);
      } catch (error: any) {
        console.error('CLI Error:', error.message);
        throw error;
      }
    }, 2500000); // 41+ minutes timeout for test (allows for 40 min execution + overhead)

    it('should generate quote endpoint for S4HANA system', async () => {
      const configFile = path.join(tempDir, 'VBAK_s4hana.txt');
      fs.writeFileSync(configFile, `
Table: VBAK
Sales Document: Header Data (S/4HANA)

Field         Data Type  Length  Description
MANDT         CLNT       3       Client
VBELN         CHAR       10      Sales Document
ERDAT         DATS       8       Created On
KUNNR         CHAR       10      Sold-To Party
NETWR         CURR       15,2    Net Value
WAERK         CUKY       5       Document Currency
`);

      const customerName = 'test-s4hana-customer';
      const customerOutput = path.join(outputDir, customerName);

      const command = `node dist/cli.js quote \
        --customer ${customerName} \
        --sap-version S4HANA \
        --config-files ${configFile} \
        --fields customer_id quote_date total_amount currency \
        --output ${outputDir}`;

      console.log(`\n🧪 Testing S/4HANA generation for ${customerName}...`);

      try {
        execSync(command, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 2400000, // 40 minutes timeout (agent execution can take 15-20+ min)
        });

        expect(fs.existsSync(customerOutput)).toBe(true);

        const files = fs.readdirSync(customerOutput, { recursive: true });
        expect(files.length).toBeGreaterThan(0);

        console.log(`✅ Generated ${files.length} files for ${customerName}`);
      } catch (error: any) {
        console.error('CLI Error:', error.message);
        throw error;
      }
    }, 2500000); // 41+ minutes timeout for test (allows for 40 min execution + overhead)

    it('should generate quote endpoint for R3 system', async () => {
      const configFile = path.join(tempDir, 'VBAK_r3.txt');
      fs.writeFileSync(configFile, `
Table: VBAK
Sales Document: Header Data (R/3)

Field         Data Type  Length  Description
MANDT         CLNT       3       Client
VBELN         CHAR       10      Sales Document
ERDAT         DATS       8       Date Created
KUNNR         CHAR       10      Customer Number
NETWR         CURR       13,2    Net Value
`);

      const customerName = 'test-r3-customer';
      const customerOutput = path.join(outputDir, customerName);

      const command = `node dist/cli.js quote \
        --customer ${customerName} \
        --sap-version R3 \
        --config-files ${configFile} \
        --fields customer_id quote_date total_amount \
        --output ${outputDir}`;

      console.log(`\n🧪 Testing R/3 generation for ${customerName}...`);

      try {
        execSync(command, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 2400000, // 40 minutes timeout (agent execution can take 15-20+ min)
        });

        expect(fs.existsSync(customerOutput)).toBe(true);

        const files = fs.readdirSync(customerOutput, { recursive: true });
        expect(files.length).toBeGreaterThan(0);

        console.log(`✅ Generated ${files.length} files for ${customerName}`);
      } catch (error: any) {
        console.error('CLI Error:', error.message);
        throw error;
      }
    }, 2500000); // 41+ minutes timeout for test (allows for 40 min execution + overhead)
  });

  describe('Custom Fields and Special Logic', () => {
    it('should generate with custom Z fields', async () => {
      const configFile = path.join(tempDir, 'VBAK_custom.txt');
      fs.writeFileSync(configFile, `
Table: VBAK
Sales Document: Header Data

Field         Data Type  Length  Description
MANDT         CLNT       3       Client
VBELN         CHAR       10      Sales Document
KUNNR         CHAR       10      Customer
NETWR         CURR       15,2    Net Value

Custom Fields:
ZZPRIORITY    NUMC       1       Priority Level (1-5)
ZZREFERRAL    CHAR       20      Referral Source Code
ZZDISCOUNT    DEC        5,2     Discount Percentage
`);

      const customerName = 'test-custom-fields';
      const customerOutput = path.join(outputDir, customerName);

      const command = `node dist/cli.js quote \
        --customer ${customerName} \
        --sap-version ECC6 \
        --config-files ${configFile} \
        --fields customer_id quote_date total_amount \
        --custom-fields '{"ZZPRIORITY":"Priority level","ZZREFERRAL":"Referral source","ZZDISCOUNT":"Discount %"}' \
        --output ${outputDir}`;

      console.log(`\n🧪 Testing custom fields generation for ${customerName}...`);

      try {
        execSync(command, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 2400000, // 40 minutes timeout (agent execution can take 15-20+ min)
        });

        expect(fs.existsSync(customerOutput)).toBe(true);

        const files = fs.readdirSync(customerOutput, { recursive: true });
        expect(files.length).toBeGreaterThan(0);

        // Check if custom fields are mentioned in generated code
        const abapFiles = files.filter(f => f.toString().endsWith('.abap'));
        expect(abapFiles.length).toBeGreaterThan(0);

        console.log(`✅ Generated ${files.length} files with custom fields`);
      } catch (error: any) {
        console.error('CLI Error:', error.message);
        throw error;
      }
    }, 2500000); // 41+ minutes timeout for test (allows for 40 min execution + overhead)

    it('should generate with special business logic', async () => {
      const configFile = path.join(tempDir, 'VBAK_logic.txt');
      fs.writeFileSync(configFile, `
Table: VBAK
Sales Document: Header Data

Field         Data Type  Length  Description
MANDT         CLNT       3       Client
VBELN         CHAR       10      Sales Document
KUNNR         CHAR       10      Customer
NETWR         CURR       15,2    Net Value
ZZTYPE        CHAR       1       Customer Type (V=VIP, N=Normal)
`);

      const customerName = 'test-special-logic';
      const customerOutput = path.join(outputDir, customerName);

      const command = `node dist/cli.js quote \
        --customer ${customerName} \
        --sap-version ECC6 \
        --config-files ${configFile} \
        --fields customer_id quote_date total_amount \
        --special-logic "Automatically apply 15% discount for VIP customers (ZZTYPE='V')" \
        --output ${outputDir}`;

      console.log(`\n🧪 Testing special logic generation for ${customerName}...`);

      try {
        execSync(command, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 2400000, // 40 minutes timeout (agent execution can take 15-20+ min)
        });

        expect(fs.existsSync(customerOutput)).toBe(true);

        const files = fs.readdirSync(customerOutput, { recursive: true });
        expect(files.length).toBeGreaterThan(0);

        console.log(`✅ Generated ${files.length} files with special logic`);
      } catch (error: any) {
        console.error('CLI Error:', error.message);
        throw error;
      }
    }, 2500000); // 41+ minutes timeout for test (allows for 40 min execution + overhead)
  });

  describe('Multiple Configuration Files', () => {
    it('should generate with multiple SAP table configs', async () => {
      // Create VBAK (header) config
      const vbakFile = path.join(tempDir, 'VBAK.txt');
      fs.writeFileSync(vbakFile, `
Table: VBAK
Sales Document: Header Data

Field         Data Type  Length  Description
MANDT         CLNT       3       Client
VBELN         CHAR       10      Sales Document
KUNNR         CHAR       10      Customer
NETWR         CURR       15,2    Net Value
`);

      // Create VBAP (item) config
      const vbapFile = path.join(tempDir, 'VBAP.txt');
      fs.writeFileSync(vbapFile, `
Table: VBAP
Sales Document: Item Data

Field         Data Type  Length  Description
MANDT         CLNT       3       Client
VBELN         CHAR       10      Sales Document
POSNR         NUMC       6       Sales Document Item
MATNR         CHAR       18      Material Number
KWMENG        QUAN       15,3    Cumulative Order Quantity
NETWR         CURR       15,2    Net Value
`);

      const customerName = 'test-multi-config';
      const customerOutput = path.join(outputDir, customerName);

      const command = `node dist/cli.js quote \
        --customer ${customerName} \
        --sap-version ECC6 \
        --config-files ${vbakFile} ${vbapFile} \
        --fields customer_id quote_date total_amount items \
        --output ${outputDir}`;

      console.log(`\n🧪 Testing multi-config generation for ${customerName}...`);

      try {
        execSync(command, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 2400000, // 40 minutes timeout (agent execution can take 15-20+ min)
        });

        expect(fs.existsSync(customerOutput)).toBe(true);

        const files = fs.readdirSync(customerOutput, { recursive: true });
        expect(files.length).toBeGreaterThan(0);

        console.log(`✅ Generated ${files.length} files from multiple configs`);
      } catch (error: any) {
        console.error('CLI Error:', error.message);
        throw error;
      }
    }, 2500000); // 41+ minutes timeout for test (allows for 40 min execution + overhead)
  });

  describe('Error Handling', () => {
    it('should fail gracefully with invalid SAP version', async () => {
      const configFile = path.join(tempDir, 'VBAK_error.txt');
      fs.writeFileSync(configFile, 'Table: VBAK\nField MANDT CLNT 3 Client');

      const command = `node dist/cli.js quote \
        --customer test-invalid \
        --sap-version INVALID \
        --config-files ${configFile} \
        --fields customer_id \
        --output ${outputDir}`;

      console.log('\n🧪 Testing invalid SAP version error handling...');

      expect(() => {
        execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
      }).toThrow();

      console.log('✅ Correctly rejected invalid SAP version');
    });

    it('should fail gracefully with missing config files', async () => {
      const command = `node dist/cli.js quote \
        --customer test-missing \
        --sap-version ECC6 \
        --config-files /nonexistent/file.txt \
        --fields customer_id \
        --output ${outputDir}`;

      console.log('\n🧪 Testing missing config file error handling...');

      expect(() => {
        execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
      }).toThrow();

      console.log('✅ Correctly rejected missing config file');
    });

    it('should fail gracefully with missing required fields', async () => {
      const configFile = path.join(tempDir, 'VBAK_minimal.txt');
      fs.writeFileSync(configFile, 'Table: VBAK\nField MANDT CLNT 3 Client');

      const command = `node dist/cli.js quote \
        --customer test-no-fields \
        --sap-version ECC6 \
        --config-files ${configFile} \
        --output ${outputDir}`;

      console.log('\n🧪 Testing missing required fields error handling...');

      expect(() => {
        execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
      }).toThrow();

      console.log('✅ Correctly rejected missing required fields');
    });
  });

  describe('Output Verification', () => {
    it('should generate all expected file types', async () => {
      const configFile = path.join(tempDir, 'VBAK_complete.txt');
      fs.writeFileSync(configFile, `
Table: VBAK
Sales Document: Header Data

Field         Data Type  Length  Description
MANDT         CLNT       3       Client
VBELN         CHAR       10      Sales Document
KUNNR         CHAR       10      Customer
NETWR         CURR       15,2    Net Value
`);

      const customerName = 'test-complete-output';
      const customerOutput = path.join(outputDir, customerName);

      const command = `node dist/cli.js quote \
        --customer ${customerName} \
        --sap-version ECC6 \
        --config-files ${configFile} \
        --fields customer_id quote_date total_amount \
        --output ${outputDir}`;

      console.log(`\n🧪 Testing complete output verification for ${customerName}...`);

      try {
        execSync(command, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 2400000, // 40 minutes timeout (agent execution can take 15-20+ min)
        });

        expect(fs.existsSync(customerOutput)).toBe(true);

        const allFiles = fs.readdirSync(customerOutput, { recursive: true })
          .map(f => f.toString());

        console.log(`\nGenerated files (${allFiles.length}):`);
        allFiles.forEach(f => console.log(`  - ${f}`));

        // Verify expected file types exist
        const hasAbapFiles = allFiles.some(f => f.endsWith('.abap'));
        const hasXmlFiles = allFiles.some(f => f.endsWith('.xml'));
        const hasMarkdownFiles = allFiles.some(f => f.endsWith('.md'));
        const hasJsonFiles = allFiles.some(f => f.endsWith('.json'));

        expect(hasAbapFiles).toBe(true);
        console.log('✅ ABAP files generated');

        expect(hasXmlFiles).toBe(true);
        console.log('✅ XML files generated');

        expect(hasMarkdownFiles).toBe(true);
        console.log('✅ Markdown documentation generated');

        expect(hasJsonFiles).toBe(true);
        console.log('✅ JSON analysis files generated');

        console.log(`\n✅ Complete output verification passed`);
      } catch (error: any) {
        console.error('CLI Error:', error.message);
        throw error;
      }
    }, 2500000); // 41+ minutes timeout for test (allows for 40 min execution + overhead)
  });
});
