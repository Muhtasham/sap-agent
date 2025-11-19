# CLI Integration Tests

Parallelized integration tests for SAP endpoint generator CLI with automatic retry logic and rate limiting.

## Overview

These tests execute the **actual CLI** with real Anthropic API calls to verify end-to-end code generation. They run by default when `ANTHROPIC_API_KEY` is set (loaded from .env automatically) and are organized into separate files to enable **parallel execution** while respecting Anthropic's rate limits.

### Latest Test Results (2 workers)

✅ **All 10 tests passed**
⏱️ **Total time:** 1h 56min
📊 **Files generated:** 73 files across all tests
🔄 **Retries needed:** 0 (all passed first attempt)
🚫 **Rate limit errors:** 0

### Test Organization

| File | Tests | Duration | Description |
|------|-------|----------|-------------|
| `basic-quote-generation.test.ts` | 3 | ~80 min | ECC6, S4HANA, R3 systems |
| `custom-fields.test.ts` | 2 | ~75 min | Custom Z* fields, special logic |
| `multi-config.test.ts` | 1 | ~35 min | Multi-table (VBAK + VBAP) |
| `output-verification.test.ts` | 1 | ~25 min | Complete file type verification |
| `error-handling.test.ts` | 3 | <1 sec | Fast validation errors |
| **Total** | **10** | **~2 hours (parallel, 2 workers)** | **3+ hours (serial)** |

**Note:** Times are based on actual test runs with real API calls. Individual test durations may vary based on API response times.

## Rate Limits

Anthropic API rate limits for Claude Sonnet 4.x:

- **50 requests per minute (RPM)**
- **30,000 input tokens per minute (ITPM)**
- **8,000 output tokens per minute (OTPM)**

### Parallelization Strategy

Running **2 tests in parallel** is the recommended configuration:
- Each test makes 10-20+ API calls during execution (20-40 minutes per test)
- 2 concurrent tests stay well under 50 RPM limit
- **Actual results:** ~2 hours total (vs 3+ hours serial)
- **Speedup:** ~1.5x faster with parallelization

## Usage

### Prerequisites

**Option 1: Use .env file (recommended)**
```bash
# API key is automatically loaded from .env file in project root
# Just ensure .env contains:
# ANTHROPIC_API_KEY=your-key-here

npm run build
npm run test:integration
```

**Option 2: Export manually**
```bash
export ANTHROPIC_API_KEY=your-key-here
npm run build
npm run test:integration
```

### Running Tests

**Recommended (2 workers, rate-limit safe):**
```bash
npm run test:integration
# Runs with --maxWorkers=2
# Expected: ~2 hours
# Actual from last run: 1h 56min
```

**Faster (3 workers, monitor rate limits):**
```bash
npm run test:integration:parallel
# Runs with --maxWorkers=3
# Expected: ~1.5 hours
# Note: May hit rate limits if tests overlap heavily
```

**Serial (1 worker, slowest but safest):**
```bash
npm run test:integration:serial
# Runs with --runInBand
# Expected: 3+ hours
# Use for debugging or rate limit issues
```

**Fast validation only (no agent execution):**
```bash
npm run test:integration:fast
# Runs error-handling.test.ts only
# Expected: <5 seconds
# Useful for quick validation
```

**Individual test files:**
```bash
# Run specific test suite
npm test tests/cli-integration/basic-quote-generation.test.ts
npm test tests/cli-integration/custom-fields.test.ts
npm test tests/cli-integration/multi-config.test.ts
npm test tests/cli-integration/output-verification.test.ts
npm test tests/cli-integration/error-handling.test.ts
```

## Retry Logic

All tests use automatic retry with exponential backoff:

### Default Configuration

```typescript
{
  maxRetries: 3,           // Retry up to 3 times
  initialDelay: 5000,      // Start with 5 seconds
  maxDelay: 60000,         // Cap at 60 seconds
  backoffMultiplier: 2     // Double delay each retry
}
```

### Retry Delays

| Attempt | Delay |
|---------|-------|
| 1st retry | 5 seconds |
| 2nd retry | 10 seconds |
| 3rd retry | 20 seconds |

### When Retries Trigger

- **429 Rate Limit Error** → Automatic retry with backoff
- **Network Error** → No retry (immediate failure)
- **Timeout** → No retry (immediate failure)
- **Other Errors** → No retry (immediate failure)

## Test Utilities

Shared utilities in `test-utils.ts`:

### Setup/Cleanup

```typescript
setupTestEnvironment()     // Creates temp directories
cleanupTestEnvironment()   // Removes temp directories
buildProject()             // Compiles TypeScript
```

### CLI Execution

```typescript
executeCLIWithRetry(command, {
  timeout: 2400000,        // 40 minutes
  testName: 'Test Name',
  retryConfig: { ... }     // Optional override
})
```

### Config Files

```typescript
createConfigFile(tempDir, 'VBAK.txt', SAP_TABLE_CONFIGS.VBAK_ECC6)
```

### Verification

```typescript
verifyOutputDirectory(customerOutput)
verifyFilesGenerated(customerOutput, minFiles)
verifyFileTypes(files, [
  { extension: '.abap', name: 'ABAP' },
  { extension: '.xml', name: 'XML' }
])
```

### Command Building

```typescript
buildQuoteCommand({
  customerName: 'test-customer',
  sapVersion: 'ECC6',
  configFiles: ['VBAK.txt'],
  fields: ['customer_id', 'quote_date'],
  outputDir: '/tmp/output',
  customFields: { ZZFIELD: 'description' },
  specialLogic: 'Apply 15% discount for VIP'
})
```

## SAP Table Configs

Pre-defined SAP table configurations in `SAP_TABLE_CONFIGS`:

- `VBAK_ECC6` - ECC6 sales header
- `VBAK_S4HANA` - S/4HANA sales header (includes WAERK)
- `VBAK_R3` - R/3 sales header
- `VBAK_CUSTOM` - With custom Z* fields (ZZPRIORITY, ZZREFERRAL, ZZDISCOUNT)
- `VBAK_LOGIC` - With special logic field (ZZTYPE)
- `VBAK_COMPLETE` - Complete verification
- `VBAK_HEADER` - Header table for multi-config
- `VBAP_ITEM` - Item table for multi-config

## Adding New Tests

1. **Create new test file:**
   ```typescript
   // tests/cli-integration/my-new-test.test.ts
   import { setupTestEnvironment, ... } from './test-utils';

   const describeIfManual = shouldRunTests ? describe : describe.skip;

   describeIfManual('My New Test Suite', () => {
     let config: TestConfig;

     beforeAll(() => {
       config = setupTestEnvironment();
       buildProject();
     });

     afterAll(() => {
       cleanupTestEnvironment(config.tempDir);
     });

     it('should do something', async () => {
       // Your test here
     }, 2500000); // 41+ min timeout
   });
   ```

2. **Use shared utilities** - Don't duplicate code

3. **Follow naming convention:**
   - `basic-*` - Standard SAP systems
   - `custom-*` - Custom fields/logic
   - `multi-*` - Multi-table scenarios
   - `error-*` - Error handling (fast)
   - `output-*` - Output verification

4. **Set appropriate timeout:**
   - Agent tests: `2500000` (41+ minutes)
   - Error tests: Default (5 seconds)

## Troubleshooting

### Rate Limit Errors (429)

**Symptom:** Test fails with "rate limit" or "429" error

**Solutions:**
1. Use serial execution: `npm run test:integration:serial`
2. Reduce workers: `--maxWorkers=1`
3. Wait 1 minute and retry
4. Check Anthropic dashboard for quota

### Timeouts

**Symptom:** Test fails with "timeout exceeded" after 40 minutes

**Possible causes:**
- API slowdown (Anthropic service issues)
- Complex generation (multi-table, custom fields)
- Network latency

**Solutions:**
1. Retry the test (may be temporary)
2. Increase timeout in specific test if needed
3. Check Anthropic status page

### Tests Skipped

**Symptom:** All tests show as "skipped"

**Cause:** Missing ANTHROPIC_API_KEY

**Solution:**
```bash
export ANTHROPIC_API_KEY=your-key
npm run test:integration
```

### Build Errors

**Symptom:** "Cannot find module 'dist/cli.js'"

**Solution:**
```bash
npm run build
npm run test:integration
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Integration Tests
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    npm run build
    npm run test:integration
  timeout-minutes: 150
```

**Notes:**
- Set `timeout-minutes: 150` (2.5 hours) to allow for parallel execution
- Use `test:integration` (2 workers) for CI to avoid rate limits
- Store API key as GitHub secret
- Tests typically complete in ~2 hours

## Performance Comparison

| Execution Mode | Workers | Duration | Rate Limit Risk | Notes |
|----------------|---------|----------|-----------------|-------|
| Serial | 1 | 3+ hours | None | Slowest, safest |
| **Safe Parallel** | **2** | **~2 hours** | **Very Low** | **Recommended** ✅ |
| Fast Parallel | 3 | ~1.5 hours | Low | Monitor for 429s |
| Max Parallel | 7 | <1 hour | **HIGH** ⚠️ | **Not recommended** |

**Actual Results (2 workers):** 1h 56min for all 10 tests

**Recommendation:** Use `npm run test:integration` (2 workers) for best balance of speed and reliability.

## Test Coverage

Integration tests verify:

✅ **SAP Versions:** R3, ECC6, S/4HANA
✅ **Custom Fields:** Z* field handling (ZZPRIORITY, ZZREFERRAL, ZZDISCOUNT)
✅ **Special Logic:** VIP discount automation
✅ **Multi-Table:** Header + items (VBAK + VBAP)
✅ **File Types:** ABAP, XML, Markdown, JSON
✅ **Error Handling:** Invalid version, missing files, missing fields
✅ **End-to-End:** CLI → Agent → Generated code

## Cost Estimation

Each test suite costs approximately:
- **Basic generation:** $2-3 per test
- **Custom fields:** $3-4 per test
- **Multi-config:** $4-5 per test

**Total for all 10 tests:** ~$25-35 per full run

**Tip:** Run `error-handling.test.ts` frequently (free), run full suite less often.

## Related Files

- `src/cli.ts` - CLI implementation
- `src/agents/*.ts` - Agent implementations
- `package.json` - npm scripts
- `test-utils.ts` - Shared test utilities

## Questions?

See main documentation:
- `README.md` - Project overview
- `GETTING_STARTED.md` - Quick start guide
- `DEPLOYMENT.md` - Production deployment
