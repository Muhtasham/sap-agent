# SAP Endpoint Generator

> AI-powered SAP ABAP code generator for OData endpoints using Claude Agent SDK

Automatically generate production-ready SAP quote creation endpoints in minutes instead of days. Built with Claude's Agent SDK and powered by advanced AI for intelligent code generation.

## Features

- **Intelligent Code Generation**: Automatically generates ABAP function modules, OData services, and supporting classes
- **Customization-Aware**: Handles customer-specific fields, tables, and business logic
- **Multi-Version Support**: Compatible with R/3, ECC 6.0, and S/4HANA
- **Production-Ready**: Includes error handling, authorization checks, and transaction safety
- **Complete Testing**: Generates ABAP unit tests, integration test scenarios, and API test collections
- **Detailed Documentation**: Creates step-by-step deployment guides for SAP administrators
- **Cost-Effective**: Generate endpoints for ~$2-3 in API costs

## Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd sap-agent

# Install dependencies
npm install

# Build the project
npm run build
```

### Initialize a New Project

```bash
# Create example configuration files
npx sap-generate init

# This creates:
# - sap-config/VBAK_structure.txt
# - sap-config/custom_fields.txt
# - example-command.sh
```

### Generate Your First Endpoint

```bash
npx sap-generate quote \
  --customer acme \
  --sap-version ECC6 \
  --config-files sap-config/VBAK_structure.txt sap-config/custom_fields.txt \
  --fields customer_id quote_date valid_until total_amount \
  --custom-fields '{"ZZPRIORITY":"Priority level","ZZREFERRAL":"Referral source"}' \
  --special-logic "Apply 10% discount for VIP customers"
```

### What Gets Generated

After running the generator, you'll find these files in `./output/{customer}/`:

```
output/acme/
├── analysis.json                           # SAP system analysis
├── Z_CREATE_QUOTE_ACME.abap               # Function module
├── ZACME_QUOTE_SRV.xml                    # OData service definition
├── ZCL_ACME_QUOTE_DPC_EXT.abap           # Data provider class
├── ZCL_ACME_QUOTE_MPC_EXT.abap           # Model provider class
├── DEPLOYMENT_GUIDE.md                     # Step-by-step deployment instructions
└── tests/
    ├── Z_CREATE_QUOTE_ACME_TEST.abap      # ABAP unit tests
    ├── integration_tests.md                # Integration test scenarios
    └── acme_quote_api_tests.json          # Postman collection
```

## CLI Commands

### Generate Quote Endpoint

```bash
sap-generate quote [options]

Options:
  -c, --customer <name>          Customer name (required)
  -v, --sap-version <version>    SAP version: R3, ECC6, or S4HANA (required)
  -f, --config-files <files...>  SAP configuration files (required)
  -o, --output <dir>             Output directory (default: ./output)
  --fields <fields...>           Required quote fields
  --custom-fields <json>         Custom fields as JSON
  --special-logic <text>         Special business logic description
  --resume <session-id>          Resume from a previous session ID
  --fork                         Fork the resumed session (creates new branch)
```

### Initialize Project

```bash
sap-generate init [options]

Options:
  -d, --directory <dir>          Project directory (default: current)
```

### Validate Config Files

```bash
sap-generate validate [options]

Options:
  -f, --files <files...>         Config files to validate (required)
```

## Configuration Files

The generator needs SAP configuration files to understand your system. These are typically exports from SAP transactions.

### VBAK Structure File

Export table structure from SE11 or SE16:

```
Table: VBAK
Sales Document: Header Data

Field         Data Type  Length  Description
* MANDT       CLNT       3       Client
* VBELN       CHAR       10      Sales Document
ERDAT         DATS       8       Creation Date
...

Custom Fields:
ZZPRIORITY    NUMC       1       Priority Level
ZZREFERRAL    CHAR       20      Referral Source
```

### Custom Fields File

Document your custom fields:

```
Table: VBAK

Field Name     Type  Length  Description
ZZPRIORITY     NUMC  1       Customer Priority (1-5)
ZZREFERRAL     CHAR  20      Referral Source Code

Table: VBAP

Field Name     Type  Length  Description
ZZWARRANTY     NUMC  2       Warranty Period (Months)
```

## Architecture

### Agent-Based Generation

The SAP Endpoint Generator uses a multi-agent architecture powered by Claude Agent SDK with specialized subagents:

1. **Orchestrator Agent** (`quoteEndpointAgent`): Coordinates the overall workflow
2. **Context Analyzer** (`sapContextAgent`): Analyzes SAP configuration and extracts customizations
3. **Code Generator** (`abapCodeGenerator`): Generates ABAP code from templates
4. **Test Generator** (`testGenerator`): Creates comprehensive test suites
5. **Deployment Guide Generator** (`deploymentGuide`): Writes step-by-step deployment documentation

#### Multi-Agent Workflow

```mermaid
graph TD
    A[User Request] --> B[Orchestrator Agent]
    B -->|Delegate| C[Context Analyzer]
    B -->|Delegate| D[Code Generator]
    B -->|Delegate| E[Test Generator]
    B -->|Delegate| F[Deployment Guide]
    
    C -->|SAP Analysis| G[analysis.json]
    D -->|ABAP Code| H[Function Modules & OData]
    E -->|Test Suites| I[Unit Tests & Postman]
    F -->|Documentation| J[DEPLOYMENT_GUIDE.md]
    
    G --> K[Complete Package]
    H --> K
    I --> K
    J --> K
    
    style B fill:#e1f5ff
    style C fill:#fff4e1
    style D fill:#fff4e1
    style E fill:#fff4e1
    style F fill:#fff4e1
    style K fill:#e8f5e9
```

#### MCP Tools Integration

```mermaid
graph LR
    A[Agents] --> B{MCP Server}
    B --> C[parse_sap_table]
    B --> D[validate_abap_syntax]
    B --> E[generate_odata_metadata]
    B --> F[extract_sap_customizations]
    
    C -->|DDIC Parser| G[Table Structures]
    D -->|Syntax Validator| H[Code Validation]
    E -->|OData Generator| I[Service Metadata]
    F -->|Customization Parser| J[Z/Y Fields & Tables]
    
    style B fill:#e1f5ff
    style C fill:#fff4e1
    style D fill:#fff4e1
    style E fill:#fff4e1
    style F fill:#fff4e1
```

#### Generation Flow

```mermaid
sequenceDiagram
    participant User
    participant Orchestrator
    participant Context as Context Analyzer
    participant Code as Code Generator
    participant Test as Test Generator
    participant Deploy as Deployment Guide
    participant MCP as MCP Tools
    
    User->>Orchestrator: Generate Quote Endpoint
    Orchestrator->>Context: Analyze SAP Config
    Context->>MCP: extract_sap_customizations
    Context->>MCP: parse_sap_table
    MCP-->>Context: Customization Data
    Context-->>Orchestrator: analysis.json
    
    Orchestrator->>Code: Generate ABAP Code
    Code->>MCP: validate_abap_syntax
    Code->>MCP: generate_odata_metadata
    MCP-->>Code: Validated Code
    Code-->>Orchestrator: ABAP Files
    
    Orchestrator->>Test: Generate Tests
    Test-->>Orchestrator: Test Suites
    
    Orchestrator->>Deploy: Create Guide
    Deploy-->>Orchestrator: Documentation
    
    Orchestrator-->>User: Complete Package
    
    Note over User,Deploy: All agents run with specialized prompts & tool access
```

### MCP Tools

Custom Model Context Protocol (MCP) tools provide SAP-specific capabilities:

- `parse_sap_table`: Parse SAP table structures from DDIC exports
- `validate_abap_syntax`: Validate generated ABAP code
- `generate_odata_metadata`: Generate OData service metadata XML
- `extract_sap_customizations`: Extract customizations from config files

### Session Management

The generator captures session IDs for resumption and forking:

#### Programmatic API

```typescript
const { sessionId } = await generateQuoteEndpoint(request);

// Resume the session to continue work
const resumed = await generateQuoteEndpoint({
  ...request,
  resume: sessionId,
  forkSession: false  // Continue original session
});

// Fork to try alternative approaches
const forked = await generateQuoteEndpoint({
  ...request,
  resume: sessionId,
  forkSession: true  // Create new branch
});
```

#### CLI Usage

```bash
# Initial generation - save the session ID from output
sap-generate quote --customer acme --sap-version ECC6 --config-files config/*.txt
# Output: ✅ Session ID: abc-123-xyz

# Resume the session to continue where you left off
sap-generate quote --resume abc-123-xyz --customer acme --sap-version ECC6 --config-files config/*.txt

# Fork the session to try a different approach
sap-generate quote --resume abc-123-xyz --fork --customer acme --sap-version ECC6 --config-files config/*.txt
```

**Benefits:**
- **Resume interrupted generation** - Continue from where you left off
- **Fork workflows** - Explore different approaches without losing original
- **Session history** - Full conversation context preserved

## Production Deployment

### Deploy to Modal (TypeScript SDK)

For pilot customers and production use, deploy to Modal for serverless, on-demand code generation:

```bash
# Install Modal CLI (one-time setup)
pip install modal
modal setup

# Add your Anthropic API key
modal secret create anthropic-api-key ANTHROPIC_API_KEY=sk-ant-...

# Start the API server
npm run serve
```

This creates an HTTP API with interactive Swagger documentation:

**Interactive API Docs:** http://localhost:3000/api-docs

**Example API Call:**
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "acme",
    "sap_version": "ECC6",
    "config_files": {
      "VBAK_structure.txt": "Table: VBAK\n..."
    },
    "quote_fields": ["customer_id", "quote_date"]
  }'
```

**API Endpoints:**
- `GET /api-docs` - Interactive Swagger UI
- `POST /api/generate` - Generate SAP code
- `GET /api/download/:customer` - Download code as tar.gz
- `GET /api/customers` - List all customers

### Cost Estimation

**For 10 generations/day:**
- Infrastructure (Modal): **~$2.40/month**
- AI API (Anthropic): **~$600/month**
- Storage: **<$0.01/month**

**Total: ~$600/month** (dominated by API costs)

### Web Interface

A ready-to-use web interface is provided in `examples/web-client.html`:

```bash
# Update the endpoint URL in the file
sed -i 's/YOUR_MODAL_ENDPOINT_URL_HERE/https:\/\/your-endpoint.modal.run/' examples/web-client.html

# Serve it
python -m http.server 8000
# Open http://localhost:8000/examples/web-client.html
```

### Documentation

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide including:
- Security considerations
- Monitoring and observability
- Integration examples (React, FastAPI)
- Session management in production
- Pilot customer checklist

## Development

### Project Structure

```
sap-agent/
├── src/
│   ├── agents/              # Agent definitions
│   ├── mcp-server/          # MCP tools and server
│   ├── parsers/             # SAP config parsers
│   ├── validators/          # Code validators
│   ├── templates/           # ABAP code templates
│   ├── types/               # TypeScript types
│   ├── index.ts             # Main entry point
│   └── cli.ts               # CLI tool
├── examples/                # Example SAP configs
├── tests/                   # Test suite
└── output/                  # Generated code output
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch

# Lint code
npm run lint
npm run lint:fix  # Auto-fix issues
```

**Current Test Coverage** (104 tests, all passing):
- ✅ Statements: 88%
- ✅ Branches: 79%
- ✅ Functions: 82%
- ✅ Lines: 88%

### Building

```bash
# Clean build directory
npm run clean

# Compile TypeScript
npm run build

# Development mode
npm run dev
```

## Use Cases

### 1. Quote Creation Endpoint (MVP)

Generate a complete quote creation endpoint with:
- Customer validation
- Custom fields handling
- Pricing logic
- Authorization checks
- Full audit trail

**Time to deploy**: ~5 minutes (vs. 2-3 days manual)

### 2. Order Management API

Extend to create order creation and modification endpoints:
- Create orders from quotes
- Update order status
- Handle line items
- Integration with external systems

### 3. Customer Self-Service Portal

Enable customers to:
- Create quotes online
- Track quote status
- Accept/reject quotes
- View history

## Business Value

### Cost Savings

- **Traditional Approach**: €3K-5K consultant fees, 3-5 days development
- **With Generator**: €2-3 API costs, 5 minutes generation time
- **ROI**: 1000x+ margin

### Speed

- Manual development: 3-5 days
- With generator: 5 minutes
- **60x-100x faster**

### Quality

- Consistent code quality
- Best practices enforced
- Comprehensive testing
- Production-ready from day one

## Deployment

### Step 1: Generate Code

```bash
sap-generate quote --customer {name} --sap-version {version} ...
```

### Step 2: Review Generated Files

Check the code in `./output/{customer}/`

### Step 3: Follow Deployment Guide

Open `DEPLOYMENT_GUIDE.md` and follow the step-by-step instructions:

1. Create transport request
2. Create function module (SE37)
3. Create OData service (SEGW)
4. Activate ICF service (SICF)
5. Configure authorization (PFCG)
6. Test the endpoint

### Step 4: Test

Use the generated Postman collection to test the API.

## Examples

### Basic Quote Endpoint

```bash
sap-generate quote \
  --customer acme \
  --sap-version ECC6 \
  --config-files config/VBAK.txt config/custom_fields.txt \
  --fields customer_id quote_date valid_until
```

### With Custom Logic

```bash
sap-generate quote \
  --customer vip_customer \
  --sap-version S4HANA \
  --config-files config/*.txt \
  --custom-fields '{"ZZVIP":"VIP Flag","ZZDISCOUNT":"Discount %"}' \
  --special-logic "Automatically approve quotes under $10K for VIP customers"
```

## Troubleshooting

### Config Files Not Found

Ensure file paths are correct and files exist:

```bash
sap-generate validate --files config/*.txt
```

### Invalid SAP Version

Use one of: `R3`, `ECC6`, or `S4HANA` (case-insensitive)

### Custom Fields JSON Error

Ensure JSON is properly quoted:

```bash
--custom-fields '{"FIELD":"Description"}'
```

## Roadmap

### Phase 1: MVP (Current)
- [x] Quote creation endpoint generation
- [x] Basic customization support
- [x] ABAP validation
- [x] Test generation
- [x] Deployment guides

### Phase 2: Enhancement
- [ ] Order management endpoints
- [ ] Item-level operations
- [ ] Advanced pricing logic
- [ ] Approval workflows
- [ ] Integration with external systems

### Phase 3: Platform
- [ ] Web UI for code generation
- [ ] Direct SAP system integration
- [ ] Live validation against SAP
- [ ] Automatic deployment
- [ ] Monitoring and analytics

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT

## Support

For issues, questions, or feature requests:

- GitHub Issues: [Create an issue]
- Email: support@example.com
- Documentation: [Full docs]

## Acknowledgments

- Built with [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk)
- Powered by Claude Sonnet 4.5
- SAP expertise from years of consulting

---

**Made with ❤️ using Claude Agent SDK**
