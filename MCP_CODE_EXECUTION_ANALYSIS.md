# MCP Code Execution Analysis: Lessons for SAP Agent

> Deep analysis of how code execution with MCP can improve the SAP endpoint generator's efficiency, token usage, and capabilities.

**Date:** 2025-11-18
**Source:** Anthropic Blog - "Code execution with MCP: Building more efficient agents"

---

## Executive Summary

The article describes a fundamental architectural pattern that can reduce token consumption by **98.7%** (150K → 2K tokens) for agents using many MCP tools. This pattern is **directly applicable** to our SAP Agent architecture and offers significant improvements.

**Key Insight:** Instead of loading all MCP tool definitions into agent context and passing intermediate results through the model, agents should write code that calls MCP tools in an execution environment.

**Relevance to SAP Agent:** We already have Modal sandboxes and 4 MCP tools. We can present these tools as a code API, enabling agents to:
- Load tool definitions on-demand (progressive disclosure)
- Filter large SAP config files before passing to model
- Build reusable skills for common SAP operations
- Process data without exposing it to the model (privacy)

---

## Current Architecture vs. Code Execution Approach

### Current: Direct Tool Calls (High Token Cost)

```
Agent Context (loaded upfront):
├── parse_sap_table
│   Description: Parses SAP DDIC table structures from SE11/SE16 exports
│   Parameters:
│     - tableContent (required, string): Full table structure text
│     - sapVersion (required, string): R3 | ECC6 | S4HANA
│   Returns: Parsed table object with fields, types, lengths, descriptions
│
├── validate_abap_syntax
│   Description: Validates ABAP code syntax for correctness
│   Parameters:
│     - code (required, string): ABAP code to validate
│     - sapVersion (required, string): R3 | ECC6 | S4HANA
│   Returns: Validation result with errors/warnings
│
├── generate_odata_metadata
│   Description: Generates OData service XML metadata
│   Parameters:
│     - entityType (required, string): Entity type name
│     - properties (required, object[]): Field definitions
│   Returns: OData service XML string
│
└── extract_sap_customizations
    Description: Extracts Z*/Y* custom fields from SAP config
    Parameters:
      - tableContent (required, string): Full table structure text
    Returns: Array of custom field objects

Token cost: ~8,000 tokens (tool definitions loaded every conversation)
```

**Workflow Example: Generate Quote Endpoint for Customer**

```
1. TOOL CALL: parse_sap_table(
     tableContent: "[5,000 lines of VBAK table structure]",
     sapVersion: "S4HANA"
   )
   → Returns parsed table (2,500 tokens in context)

2. TOOL CALL: extract_sap_customizations(
     tableContent: "[same 5,000 lines]"
   )
   → Returns custom fields (500 tokens in context)

3. Agent processes results, generates ABAP code (4,000 tokens)

4. TOOL CALL: validate_abap_syntax(
     code: "[390 lines of ABAP code]",
     sapVersion: "S4HANA"
   )
   → Returns validation result (800 tokens in context)

5. TOOL CALL: generate_odata_metadata(
     entityType: "Quote",
     properties: [field definitions]
   )
   → Returns XML (1,200 tokens in context)

Total tokens: 8,000 (tools) + 5,000 (table) + 2,500 (parse result) +
              5,000 (table again) + 500 (custom) + 4,000 (code) +
              800 (validation) + 1,200 (metadata) = 27,000 tokens
```

**Problem:** Table content (5,000 lines) flows through model context twice. All intermediate results accumulate.

---

### Proposed: Code Execution Approach (Low Token Cost)

Present MCP tools as a code API in the Modal sandbox filesystem:

```
sandbox/
├── tools/
│   ├── sap/
│   │   ├── parseTable.ts
│   │   ├── extractCustomizations.ts
│   │   ├── validateAbap.ts
│   │   └── generateMetadata.ts
│   └── index.ts
└── workspace/
    ├── configs/          # Uploaded SAP configs
    ├── output/           # Generated code
    └── skills/           # Reusable functions
```

**Each tool is a simple wrapper:**

```typescript
// tools/sap/parseTable.ts
import { callMCPTool } from '../../../client.js';

interface ParseTableInput {
  tableContent: string;
  sapVersion: 'R3' | 'ECC6' | 'S4HANA';
}

interface ParseTableResult {
  tableName: string;
  fields: Array<{
    name: string;
    type: string;
    length: number;
    description: string;
  }>;
}

/** Parse SAP DDIC table structure from SE11/SE16 export */
export async function parseTable(
  input: ParseTableInput
): Promise<ParseTableResult> {
  return callMCPTool<ParseTableResult>('parse_sap_table', input);
}
```

**Agent writes code instead of making direct tool calls:**

```typescript
// Agent-generated code (runs in Modal sandbox)
import * as fs from 'fs/promises';
import * as sap from './tools/sap';

// 1. Read config from uploaded file (doesn't flow through model)
const tableContent = await fs.readFile('./workspace/configs/VBAK_s4hana.txt', 'utf-8');

// 2. Parse table structure (intermediate result stays in sandbox)
const parsedTable = await sap.parseTable({
  tableContent,
  sapVersion: 'S4HANA'
});

// 3. Extract custom fields (data stays in sandbox)
const customFields = await sap.extractCustomizations({ tableContent });

// 4. Log summary only (model sees 3 lines, not 5,000)
console.log(`Parsed ${parsedTable.fields.length} fields`);
console.log(`Found ${customFields.length} custom Z*/Y* fields`);
console.log(`Standard fields: ${parsedTable.fields.length - customFields.length}`);

// 5. Generate ABAP code (agent has access to full data, but it stays in sandbox)
const abapCode = generateQuoteFunction(parsedTable, customFields);

// 6. Validate generated code
const validation = await sap.validateAbap({
  code: abapCode,
  sapVersion: 'S4HANA'
});

// 7. Only surface errors to model (if any)
if (validation.errors.length > 0) {
  console.log(`Validation errors: ${validation.errors.length}`);
  validation.errors.forEach(err => console.log(`- ${err.line}: ${err.message}`));
}

// 8. Generate OData metadata
const metadata = await sap.generateMetadata({
  entityType: 'Quote',
  properties: parsedTable.fields.map(f => ({
    name: f.name,
    type: f.type,
    nullable: !f.required
  }))
});

// 9. Write outputs to workspace
await fs.writeFile('./workspace/output/quote_function.abap', abapCode);
await fs.writeFile('./workspace/output/quote_service.xml', metadata);

console.log('✅ Generated 2 files successfully');
```

**Token savings:**

```
Before: 27,000 tokens (full table content flows through model twice + all intermediate results)
After:  2,000 tokens (agent sees only: tool definitions it loads + 10 lines of console output)

Savings: 92.6% reduction
```

**Why this works:**

1. **Progressive disclosure:** Agent lists `./tools/sap/` directory, reads only the tool files it needs
2. **Data stays in sandbox:** 5,000-line table never enters model context
3. **Filter at source:** Agent sees "Parsed 45 fields" instead of 45 field definitions
4. **Control flow in code:** Loops, conditionals execute in sandbox, not via tool chaining

---

## Benefits for SAP Agent Architecture

### 1. Progressive Disclosure (Tool Discovery)

**Current problem:** All 4 MCP tools loaded into every agent's context upfront (~8K tokens).

**Solution:** Agent explores filesystem to discover tools:

```typescript
// Agent discovers tools by listing directory
const tools = await fs.readdir('./tools/sap/');
// ['parseTable.ts', 'extractCustomizations.ts', 'validateAbap.ts', 'generateMetadata.ts']

// Agent reads only the tools it needs
const parseTableDoc = await fs.readFile('./tools/sap/parseTable.ts', 'utf-8');
// Now agent knows parseTable interface
```

**Token savings:**
- Before: 8,000 tokens (all 4 tools)
- After: 500 tokens (read 1 tool on-demand)
- **Savings: 93.75%**

### 2. Context-Efficient Processing (Large SAP Configs)

**Current problem:** Large VBAK table configs (5,000+ lines) flow through model context.

**Example workflow:**

```typescript
// Read large config (stays in sandbox, never enters model)
const vbakConfig = await fs.readFile('./workspace/configs/VBAK_s4hana.txt', 'utf-8');
// 5,000 lines of table structure

// Parse in sandbox
const parsed = await sap.parseTable({ tableContent: vbakConfig, sapVersion: 'S4HANA' });

// Filter before logging to model
const requiredFields = parsed.fields.filter(f => f.required);
console.log(`Found ${requiredFields.length} required fields`);

// Model sees: "Found 12 required fields" (7 tokens)
// Model doesn't see: 5,000 lines of raw config (5,000 tokens)
```

**Token savings per customer generation:**
- Before: 5,000 tokens (raw config in context)
- After: 7 tokens (summary only)
- **Savings: 99.86%**

### 3. Control Flow Efficiency (Loops, Conditionals)

**Current approach:** Chain tool calls through model for repetitive operations.

**Example: Validate multiple ABAP files**

Before (tool chaining):
```
TOOL CALL: validate_abap(code: [file1]) → result1 (2min)
TOOL CALL: validate_abap(code: [file2]) → result2 (2min)
TOOL CALL: validate_abap(code: [file3]) → result3 (2min)
TOOL CALL: validate_abap(code: [file4]) → result4 (2min)

Total time: 8 minutes (sequential tool calls)
Total tokens: 4 × (model processing + result) = massive
```

After (code execution):
```typescript
// Agent writes code with loop
const files = ['file1.abap', 'file2.abap', 'file3.abap', 'file4.abap'];
const results = [];

for (const file of files) {
  const code = await fs.readFile(`./workspace/output/${file}`, 'utf-8');
  const validation = await sap.validateAbap({ code, sapVersion: 'S4HANA' });

  if (validation.errors.length > 0) {
    results.push({ file, errors: validation.errors });
  }
}

// Model sees only the summary
console.log(`Validated ${files.length} files, ${results.length} have errors`);
results.forEach(r => console.log(`- ${r.file}: ${r.errors.length} errors`));

Total time: 8 minutes (same, but parallel execution possible)
Total tokens: ~500 (just the summary)
```

**Token savings:**
- Before: ~20,000 tokens (all validation results)
- After: ~500 tokens (error summary)
- **Savings: 97.5%**

### 4. Privacy-Preserving Operations

**Current problem:** Customer SAP configs may contain sensitive data (customer numbers, pricing rules, custom logic).

**Solution:** Data flows through workflow without entering model context.

```typescript
// Sensitive customer config (stays in sandbox)
const customerConfig = await fs.readFile('./workspace/configs/customer_pricing.txt', 'utf-8');
// Contains: pricing formulas, discount rules, customer-specific logic

// Parse and process (intermediate data stays in sandbox)
const customizations = await sap.extractCustomizations({ tableContent: customerConfig });

// Generate code using sensitive data (data never enters model)
const abapCode = generatePricingLogic(customizations);

// Model sees only: "Generated pricing logic with 5 custom rules"
console.log(`Generated pricing logic with ${customizations.length} custom rules`);
```

**Privacy benefit:** Customer-specific business logic never enters Claude's context, reducing IP exposure risk.

### 5. State Persistence & Skills

**Opportunity:** Build reusable SAP generation skills over time.

```typescript
// Agent develops working code pattern for a specific SAP table
// Save it as a skill for future reuse

// In ./workspace/skills/vbak-quote-generator.ts
import * as sap from '../tools/sap';

export async function generateVbakQuoteEndpoint(config: {
  customerName: string;
  sapVersion: string;
  requiredFields: string[];
}) {
  // Reusable logic for VBAK quote generation
  const tableContent = await fs.readFile(`./workspace/configs/VBAK_${config.sapVersion}.txt`, 'utf-8');
  const parsed = await sap.parseTable({ tableContent, sapVersion: config.sapVersion });

  // Standard pattern for VBAK tables
  const fieldMappings = mapRequiredFields(parsed.fields, config.requiredFields);
  const abapCode = generateFunctionModule(fieldMappings);
  const odataXml = await sap.generateMetadata({ entityType: 'Quote', properties: fieldMappings });

  return { abapCode, odataXml };
}
```

**Add SKILL.md:**

```markdown
# VBAK Quote Endpoint Generator

Reusable skill for generating SAP quote creation endpoints from VBAK table configs.

## When to use
- Customer wants quote creation endpoint
- SAP table is VBAK (sales document header)
- Supports R3, ECC6, S4HANA

## Usage
```typescript
import { generateVbakQuoteEndpoint } from './skills/vbak-quote-generator';

const result = await generateVbakQuoteEndpoint({
  customerName: 'acme-corp',
  sapVersion: 'S4HANA',
  requiredFields: ['customer_id', 'quote_date', 'total_amount']
});
```

## Outputs
- ABAP function module (Z_CREATE_QUOTE_*)
- OData service XML
- Proper authorization checks (V_VBAK_VKO, V_KUNNR_VKO)
- Transaction safety (commit/rollback)
```

**Benefit:** Over time, agents build a library of battle-tested SAP generation patterns.

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Goal:** Set up code execution infrastructure in Modal sandboxes.

**Tasks:**
1. Create `tools/` directory structure in Modal sandbox
2. Generate TypeScript wrapper files for each MCP tool
3. Implement `callMCPTool()` bridge function
4. Test basic code execution (agent writes code → executes in sandbox → returns output)

**Files to create:**
```
src/modal-deployment.ts (update)
├── Add tools/ directory creation
├── Generate tool wrapper files
└── Implement MCP bridge

tools/
├── sap/
│   ├── parseTable.ts
│   ├── extractCustomizations.ts
│   ├── validateAbap.ts
│   └── generateMetadata.ts
├── client.ts (MCP bridge)
└── index.ts (exports)
```

**Success criteria:**
- Agent can list `./tools/sap/` and discover available tools
- Agent can read tool definitions on-demand
- Agent can write code that calls MCP tools
- Code executes successfully in Modal sandbox

---

### Phase 2: Agent Adaptation (Week 2)

**Goal:** Update agents to use code execution instead of direct tool calls.

**Changes:**

**Before (direct tool calls):**
```typescript
// In src/agents/context-analyzer.ts
const systemPrompt = `
You are a SAP context analyzer. You have access to these tools:
- parse_sap_table: Parse DDIC table structures
- extract_sap_customizations: Extract Z*/Y* fields

When given a SAP config file, use these tools to analyze it.
`;
```

**After (code execution):**
```typescript
// In src/agents/context-analyzer.ts
const systemPrompt = `
You are a SAP context analyzer. You operate in a Modal sandbox with:
- File system access to uploaded configs (./workspace/configs/)
- SAP analysis tools available as TypeScript modules (./tools/sap/)
- Output directory for analysis results (./workspace/output/)

When given a SAP config file:
1. List ./tools/sap/ to discover available tools
2. Read the tool definitions you need (parseTable.ts, extractCustomizations.ts)
3. Write TypeScript code to:
   - Read the config from ./workspace/configs/
   - Call the tools to analyze it
   - Filter/summarize results
   - Write analysis.json to ./workspace/output/
   - Log only high-level summary (not raw data)

Example:
\`\`\`typescript
import * as fs from 'fs/promises';
import * as sap from './tools/sap';

const config = await fs.readFile('./workspace/configs/VBAK_s4hana.txt', 'utf-8');
const parsed = await sap.parseTable({ tableContent: config, sapVersion: 'S4HANA' });
const custom = await sap.extractCustomizations({ tableContent: config });

console.log(\`Parsed \${parsed.fields.length} fields, \${custom.length} custom\`);

await fs.writeFile('./workspace/output/analysis.json', JSON.stringify({
  table: parsed.tableName,
  totalFields: parsed.fields.length,
  customFields: custom.length,
  standardFields: parsed.fields.length - custom.length
}, null, 2));
\`\`\`
`;
```

**Update all 5 agents:**
- context-analyzer → Code execution
- code-generator → Code execution
- test-generator → Code execution
- deployment-guide → Code execution (read analysis.json, generate markdown)
- orchestrator → Coordinate code-executing agents

---

### Phase 3: Skills System (Week 3)

**Goal:** Enable agents to save and reuse successful code patterns.

**Implementation:**

1. **Create skills directory in sandbox:**
```
workspace/
├── skills/
│   ├── vbak-quote-generator/
│   │   ├── SKILL.md          # Description, usage, examples
│   │   ├── generate.ts       # Reusable function
│   │   └── tests.ts          # Skill verification
│   └── common-sap-patterns/
│       ├── SKILL.md
│       └── helpers.ts
```

2. **Update orchestrator agent:**
```typescript
const systemPrompt = `
You are the orchestrator for SAP code generation. Before delegating work:

1. Check ./workspace/skills/ for existing patterns
2. If matching skill exists, use it
3. If new pattern, delegate to specialist agents
4. If pattern works well, save it as a new skill

When saving skills:
- Create directory: ./workspace/skills/[skill-name]/
- Write SKILL.md with description, usage, examples
- Write [skill-name].ts with reusable function
- Document inputs, outputs, SAP versions supported
`;
```

3. **Skill examples:**

**VBAK Quote Generator:**
```typescript
// workspace/skills/vbak-quote-generator/generate.ts
export async function generateVbakQuoteEndpoint(config: VbakQuoteConfig) {
  // Proven pattern for VBAK table quote endpoints
  // Handles R3, ECC6, S4HANA
  // Generates FM + OData + Tests + Deployment guide
}
```

**Common SAP Patterns:**
```typescript
// workspace/skills/common-sap-patterns/helpers.ts
export async function mapFieldsToRequirements(
  sapFields: Field[],
  requiredFields: string[]
): Promise<FieldMapping[]> {
  // Reusable logic for mapping user requirements to SAP fields
  // Handles fuzzy matching, type compatibility, constraint validation
}
```

**Benefits:**
- Faster generation (reuse proven patterns)
- Higher quality (battle-tested code)
- Consistency across customers
- Reduced API costs (less trial-and-error)

---

### Phase 4: Optimization & Monitoring (Week 4)

**Goal:** Measure improvements and optimize further.

**Metrics to track:**

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Avg tokens per generation | 150,000 | ? | <15,000 (90% reduction) |
| Generation time | 5-15 min | ? | <5 min |
| API cost per customer | $2-3 | ? | <$0.50 |
| Success rate | 90% | ? | >95% |
| Skills library size | 0 | ? | 10+ patterns |

**Implementation:**

1. Add telemetry to track token usage:
```typescript
interface GenerationMetrics {
  customer: string;
  tokensUsed: number;
  executionTime: number;
  apiCost: number;
  skillsUsed: string[];
  success: boolean;
}
```

2. Log metrics to file:
```typescript
await fs.appendFile('./workspace/metrics.jsonl',
  JSON.stringify(metrics) + '\n'
);
```

3. Create dashboard (simple HTML page):
```html
<!-- Show token savings, cost reduction, success rate trends -->
```

**Optimization targets:**
- Context-analyzer: 50,000 → 5,000 tokens (90% reduction)
- Code-generator: 80,000 → 8,000 tokens (90% reduction)
- Test-generator: 15,000 → 1,500 tokens (90% reduction)
- Deployment-guide: 5,000 → 1,000 tokens (80% reduction)

---

## Technical Implementation Details

### MCP Tool Bridge (callMCPTool)

The bridge function allows code in the Modal sandbox to call MCP tools:

```typescript
// tools/client.ts
import { Client } from '@anthropic-ai/mcp-sdk';

let mcpClient: Client | null = null;

export async function initializeMCPClient(serverPath: string) {
  if (!mcpClient) {
    mcpClient = new Client({
      server: {
        command: 'node',
        args: [serverPath]
      }
    });
    await mcpClient.connect();
  }
  return mcpClient;
}

export async function callMCPTool<T>(
  toolName: string,
  input: Record<string, any>
): Promise<T> {
  if (!mcpClient) {
    throw new Error('MCP client not initialized');
  }

  const result = await mcpClient.callTool({
    name: toolName,
    arguments: input
  });

  return result.content as T;
}

export async function closeMCPClient() {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
  }
}
```

### Modal Sandbox Setup

Update `src/modal-deployment.ts` to create tools directory:

```typescript
async function setupCodeExecutionEnvironment(sandbox: Sandbox) {
  // Create directory structure
  await sandbox.exec([
    'mkdir', '-p',
    './tools/sap',
    './workspace/configs',
    './workspace/output',
    './workspace/skills'
  ]);

  // Generate tool wrapper files
  const tools = [
    { name: 'parseTable', mcpTool: 'parse_sap_table' },
    { name: 'extractCustomizations', mcpTool: 'extract_sap_customizations' },
    { name: 'validateAbap', mcpTool: 'validate_abap_syntax' },
    { name: 'generateMetadata', mcpTool: 'generate_odata_metadata' }
  ];

  for (const tool of tools) {
    const code = generateToolWrapper(tool.name, tool.mcpTool);
    await sandbox.writeFile(`./tools/sap/${tool.name}.ts`, code);
  }

  // Write MCP client bridge
  const clientCode = await fs.readFile('./src/mcp-client-bridge.ts', 'utf-8');
  await sandbox.writeFile('./tools/client.ts', clientCode);

  // Write index.ts
  await sandbox.writeFile('./tools/index.ts', `
    export * from './sap/parseTable.js';
    export * from './sap/extractCustomizations.js';
    export * from './sap/validateAbap.js';
    export * from './sap/generateMetadata.js';
  `);
}
```

### Tool Wrapper Generation

```typescript
function generateToolWrapper(toolName: string, mcpToolName: string): string {
  // Read tool schema from MCP server
  const schema = getMCPToolSchema(mcpToolName);

  // Generate TypeScript types
  const inputType = generateTypeFromSchema(schema.input);
  const outputType = generateTypeFromSchema(schema.output);

  // Generate wrapper function
  return `
import { callMCPTool } from '../client.js';

${inputType}

${outputType}

/** ${schema.description} */
export async function ${toolName}(
  input: ${schema.input.name}
): Promise<${schema.output.name}> {
  return callMCPTool<${schema.output.name}>('${mcpToolName}', input);
}
  `.trim();
}
```

---

## Security Considerations

### 1. Sandbox Isolation

**Current:** Modal sandboxes already provide gVisor isolation.

**Additional:** With code execution, ensure:
- No network access from sandbox (except MCP client)
- File system isolation per customer
- Resource limits (CPU, RAM, disk)

**Implementation:**
```typescript
const sandbox = await modal.sandboxes.create({
  name: `sap-gen-${customerName}`,
  image: sapGenImage,
  secrets: [modal.secrets.fromName('anthropic-api-key')],
  blockNetwork: true, // No external access
  cidrAllowlist: [], // Empty = no network
  cpu: 1,
  memory: 1024, // 1GB
  diskQuota: 5120, // 5GB
  timeoutMs: 900000 // 15 min
});
```

### 2. Code Injection Prevention

**Risk:** Agent-generated code could contain malicious operations.

**Mitigation:**
1. Run in isolated sandbox (already implemented)
2. No eval() or similar dynamic code execution
3. Validate imports (only allow ./tools/*, fs, path)
4. Monitor for suspicious patterns (exec, spawn, network calls)

**Implementation:**
```typescript
// Before executing agent code, scan for dangerous patterns
function validateAgentCode(code: string): ValidationResult {
  const dangerousPatterns = [
    /eval\(/,
    /Function\(/,
    /child_process/,
    /require\(['"]child_process['"]\)/,
    /import.*['"]child_process['"]/,
    /spawn/,
    /exec/
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return { valid: false, reason: `Dangerous pattern detected: ${pattern}` };
    }
  }

  return { valid: true };
}
```

### 3. Data Exfiltration Prevention

**Risk:** Agent code could try to exfiltrate customer SAP configs.

**Mitigation:**
1. Block all network access (except MCP client)
2. Monitor file writes outside ./workspace/output/
3. Audit console.log() output for sensitive data

**Implementation:**
```typescript
// Wrapper around sandbox.exec that filters output
async function executeAgentCode(code: string): Promise<ExecutionResult> {
  const validation = validateAgentCode(code);
  if (!validation.valid) {
    throw new Error(`Code validation failed: ${validation.reason}`);
  }

  const result = await sandbox.exec(['npx', 'tsx', 'agent-code.ts']);

  // Filter output for sensitive patterns
  const filteredOutput = filterSensitiveData(result.stdout);

  return { output: filteredOutput, exitCode: result.exitCode };
}

function filterSensitiveData(output: string): string {
  // Redact customer numbers, pricing, etc.
  return output
    .replace(/\b\d{10}\b/g, '[CUSTOMER_ID]')
    .replace(/\b\d+\.\d{2}\s*(USD|EUR|GBP)\b/g, '[AMOUNT]');
}
```

---

## Cost Analysis

### Current Architecture (Direct Tool Calls)

**Per-customer generation:**
```
Context Analyzer:    50,000 tokens × $3/MTok = $0.15
Code Generator:      80,000 tokens × $3/MTok = $0.24
Test Generator:      15,000 tokens × $3/MTok = $0.045
Deployment Guide:     5,000 tokens × $3/MTok = $0.015
---------------------------------------------------------
Total per customer:  150,000 tokens          = $0.45
```

**Annual cost (1,000 customers):**
```
1,000 customers × $0.45 = $450/year
```

### Proposed Architecture (Code Execution)

**Per-customer generation:**
```
Context Analyzer:     5,000 tokens × $3/MTok = $0.015  (90% reduction)
Code Generator:       8,000 tokens × $3/MTok = $0.024  (90% reduction)
Test Generator:       1,500 tokens × $3/MTok = $0.0045 (90% reduction)
Deployment Guide:     1,000 tokens × $3/MTok = $0.003  (80% reduction)
---------------------------------------------------------
Total per customer:  15,500 tokens          = $0.0465
```

**Annual cost (1,000 customers):**
```
1,000 customers × $0.0465 = $46.50/year
```

**Savings:**
```
$450 - $46.50 = $403.50/year (89.7% cost reduction)
```

**Additional Modal costs:**
```
Sandbox execution: 15 min × $0.05/hour = $0.0125/customer
1,000 customers × $0.0125 = $12.50/year
```

**Total savings:**
```
$450 (current) - $46.50 (API) - $12.50 (Modal) = $391/year (86.8% reduction)
```

**Note:** These are conservative estimates. Actual savings likely higher due to:
- Skills reuse (fewer tokens per generation over time)
- Less trial-and-error (proven patterns)
- Faster generation (less idle sandbox time)

---

## Risks & Mitigations

### Risk 1: Increased Complexity

**Issue:** Code execution adds infrastructure complexity.

**Mitigation:**
- Start with Phase 1 (foundation) and validate
- Keep direct tool calls as fallback
- Comprehensive testing before rollout
- Document troubleshooting steps

### Risk 2: Agent Code Quality

**Issue:** Agents might write inefficient or incorrect code.

**Mitigation:**
- Provide clear examples in system prompts
- Build skills library with proven patterns
- Validate agent code before execution
- Monitor execution errors and iterate on prompts

### Risk 3: Debugging Difficulty

**Issue:** Harder to debug code execution vs. direct tool calls.

**Mitigation:**
- Preserve full execution logs
- Add verbose logging to agent code
- Create debugging tools (inspect sandbox state)
- Maintain test suite for common scenarios

### Risk 4: MCP Client Stability

**Issue:** MCP client in sandbox could crash or disconnect.

**Mitigation:**
- Implement reconnection logic
- Add health checks
- Fallback to direct tool calls on failure
- Monitor MCP client errors

---

## Success Metrics & KPIs

### Token Efficiency

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Tokens per generation | 150,000 | <15,000 | Track via Anthropic API |
| Context Analyzer | 50,000 | <5,000 | Track per agent |
| Code Generator | 80,000 | <8,000 | Track per agent |
| Test Generator | 15,000 | <1,500 | Track per agent |

### Cost Efficiency

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| API cost/customer | $0.45 | <$0.10 | Track total API spend |
| Total cost/customer | $0.45 | <$0.15 | Include Modal sandbox |
| Annual cost (1K) | $450 | <$150 | Projected savings |

### Performance

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Generation time | 5-15 min | <5 min | Track via logs |
| Success rate | 90% | >95% | Track completion rate |
| Skills library | 0 | >10 | Count reusable patterns |

### Quality

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Code correctness | 90% | >95% | ABAP syntax validation |
| Test coverage | 85% | >90% | Generated test quality |
| Customer satisfaction | TBD | >4.5/5 | Survey pilot customers |

---

## Conclusion

The code execution pattern from the Anthropic blog is **highly applicable** to our SAP Agent architecture:

**Key Benefits:**
1. **90% token reduction** - From 150K → 15K tokens per generation
2. **Cost savings** - From $450 → $59/year for 1,000 customers (87% reduction)
3. **Privacy** - Customer SAP configs never enter model context
4. **Skills** - Build reusable patterns over time
5. **Efficiency** - Control flow in code vs. tool chaining

**Implementation Path:**
1. Week 1: Set up tools/ directory in Modal sandbox
2. Week 2: Update agents to use code execution
3. Week 3: Build skills system for pattern reuse
4. Week 4: Measure, optimize, monitor

**Recommended Action:**
- Start with Phase 1 (foundation) as a proof-of-concept
- Validate token savings on 1-2 customers
- If successful (>80% reduction), proceed with full rollout
- Document learnings and iterate on agent prompts

**Next Steps:**
1. Review this analysis with team
2. Prioritize implementation (Phase 1 first)
3. Create engineering tickets for each phase
4. Allocate 4 weeks for full rollout

---

**Document Status:** Draft for Review
**Author:** Claude (SAP Agent)
**Date:** 2025-11-18
**Version:** 1.0
