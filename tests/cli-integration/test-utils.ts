/**
 * Shared utilities for CLI integration tests
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TestConfig {
  tempDir: string;
  outputDir: string;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 5000, // 5 seconds
  maxDelay: 60000, // 60 seconds
  backoffMultiplier: 2,
};

/**
 * Setup test environment - create temp directories
 */
export function setupTestEnvironment(): TestConfig {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sap-cli-test-'));
  const outputDir = path.join(tempDir, 'output');
  fs.mkdirSync(outputDir);
  return { tempDir, outputDir };
}

/**
 * Cleanup test environment - remove temp directories
 */
export function cleanupTestEnvironment(tempDir: string): void {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Build the project (run once before all tests)
 */
export function buildProject(): void {
  console.log('\n📦 Building project for CLI tests...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build complete\n');
}

/**
 * Sleep utility for rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * Execute CLI command with retry logic for rate limiting
 */
export async function executeCLIWithRetry(
  command: string,
  options: {
    timeout?: number;
    retryConfig?: Partial<RetryConfig>;
    testName?: string;
  } = {}
): Promise<string> {
  const {
    timeout = 2400000, // 40 minutes default
    retryConfig = {},
    testName = 'CLI command',
  } = options;

  const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`\n🧪 ${testName} (attempt ${attempt}/${config.maxRetries})...`);

      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout,
      });

      console.log(`✅ ${testName} completed successfully`);
      return output;
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error (429)
      const isRateLimitError =
        error.message?.includes('429') ||
        error.stderr?.includes('429') ||
        error.stdout?.includes('rate limit');

      if (isRateLimitError && attempt < config.maxRetries) {
        const backoffDelay = getBackoffDelay(attempt, config);
        console.log(
          `⚠️  Rate limit hit, retrying in ${backoffDelay / 1000}s (attempt ${attempt}/${config.maxRetries})`
        );
        await sleep(backoffDelay);
        continue;
      }

      // If not a rate limit error or we're out of retries, throw
      if (!isRateLimitError || attempt === config.maxRetries) {
        console.error(`❌ ${testName} failed:`, error.message);
        throw error;
      }
    }
  }

  throw lastError || new Error('Command execution failed');
}

/**
 * Create a SAP table configuration file
 */
export function createConfigFile(
  tempDir: string,
  filename: string,
  content: string
): string {
  const configFile = path.join(tempDir, filename);
  fs.writeFileSync(configFile, content);
  return configFile;
}

/**
 * Verify output directory was created
 */
export function verifyOutputDirectory(customerOutput: string): void {
  expect(fs.existsSync(customerOutput)).toBe(true);
}

/**
 * Verify files were generated
 */
export function verifyFilesGenerated(customerOutput: string, minFiles = 1): string[] {
  const files = fs.readdirSync(customerOutput, { recursive: true });
  expect(files.length).toBeGreaterThan(minFiles - 1);
  console.log(`✅ Generated ${files.length} files`);
  return files.map((f) => f.toString());
}

/**
 * Verify specific file types exist
 */
export function verifyFileTypes(
  files: string[],
  expectedTypes: { extension: string; name: string }[]
): void {
  for (const { extension, name } of expectedTypes) {
    const hasFiles = files.some((f) => f.endsWith(extension));
    expect(hasFiles).toBe(true);
    console.log(`✅ ${name} files generated`);
  }
}

/**
 * Build CLI command for quote generation
 */
export function buildQuoteCommand(options: {
  customerName: string;
  sapVersion: string;
  configFiles: string | string[];
  fields: string | string[];
  outputDir: string;
  customFields?: Record<string, string>;
  specialLogic?: string;
}): string {
  const {
    customerName,
    sapVersion,
    configFiles,
    fields,
    outputDir,
    customFields,
    specialLogic,
  } = options;

  const configFilesStr = Array.isArray(configFiles)
    ? configFiles.join(' ')
    : configFiles;
  const fieldsStr = Array.isArray(fields) ? fields.join(' ') : fields;

  let command = `node dist/cli.js quote \\
    --customer ${customerName} \\
    --sap-version ${sapVersion} \\
    --config-files ${configFilesStr} \\
    --fields ${fieldsStr} \\
    --output ${outputDir}`;

  if (customFields) {
    const customFieldsJson = JSON.stringify(customFields).replace(/"/g, '\\"');
    command += ` \\\n    --custom-fields "${customFieldsJson}"`;
  }

  if (specialLogic) {
    command += ` \\\n    --special-logic "${specialLogic}"`;
  }

  return command;
}

/**
 * Sample SAP table configurations
 */
export const SAP_TABLE_CONFIGS = {
  VBAK_ECC6: `
Table: VBAK
Sales Document: Header Data

Field         Data Type  Length  Description
MANDT         CLNT       3       Client
VBELN         CHAR       10      Sales Document
ERDAT         DATS       8       Date on Which Record Was Created
KUNNR         CHAR       10      Sold-To Party
NETWR         CURR       15,2    Net Value of the Sales Order
`,

  VBAK_S4HANA: `
Table: VBAK
Sales Document: Header Data (S/4HANA)

Field         Data Type  Length  Description
MANDT         CLNT       3       Client
VBELN         CHAR       10      Sales Document
ERDAT         DATS       8       Created On
KUNNR         CHAR       10      Sold-To Party
NETWR         CURR       15,2    Net Value
WAERK         CUKY       5       Document Currency
`,

  VBAK_R3: `
Table: VBAK
Sales Document: Header Data (R/3)

Field         Data Type  Length  Description
MANDT         CLNT       3       Client
VBELN         CHAR       10      Sales Document
ERDAT         DATS       8       Date Created
KUNNR         CHAR       10      Customer Number
NETWR         CURR       13,2    Net Value
`,

  VBAK_CUSTOM: `
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
`,

  VBAK_LOGIC: `
Table: VBAK
Sales Document: Header Data

Field         Data Type  Length  Description
MANDT         CLNT       3       Client
VBELN         CHAR       10      Sales Document
KUNNR         CHAR       10      Customer
NETWR         CURR       15,2    Net Value
ZZTYPE        CHAR       1       Customer Type (V=VIP, N=Normal)
`,

  VBAK_COMPLETE: `
Table: VBAK
Sales Document: Header Data

Field         Data Type  Length  Description
MANDT         CLNT       3       Client
VBELN         CHAR       10      Sales Document
KUNNR         CHAR       10      Customer
NETWR         CURR       15,2    Net Value
`,

  VBAK_HEADER: `
Table: VBAK
Sales Document: Header Data

Field         Data Type  Length  Description
MANDT         CLNT       3       Client
VBELN         CHAR       10      Sales Document
KUNNR         CHAR       10      Customer
NETWR         CURR       15,2    Net Value
`,

  VBAP_ITEM: `
Table: VBAP
Sales Document: Item Data

Field         Data Type  Length  Description
MANDT         CLNT       3       Client
VBELN         CHAR       10      Sales Document
POSNR         NUMC       6       Sales Document Item
MATNR         CHAR       18      Material Number
KWMENG        QUAN       15,3    Cumulative Order Quantity
NETWR         CURR       15,2    Net Value
`,
};
