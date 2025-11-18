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

The SAP Endpoint Generator uses a multi-agent architecture:

1. **Orchestrator Agent**: Coordinates the overall workflow
2. **Context Analyzer**: Analyzes SAP configuration and extracts customizations
3. **Code Generator**: Generates ABAP code from templates
4. **Test Generator**: Creates comprehensive test suites
5. **Deployment Guide Generator**: Writes step-by-step deployment documentation

### MCP Tools

Custom Model Context Protocol (MCP) tools provide SAP-specific capabilities:

- `parse_sap_table`: Parse SAP table structures from DDIC exports
- `validate_abap_syntax`: Validate generated ABAP code
- `generate_odata_metadata`: Generate OData service metadata XML
- `extract_sap_customizations`: Extract customizations from config files

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
```

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
