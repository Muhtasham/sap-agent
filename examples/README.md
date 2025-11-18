# SAP Endpoint Generator Examples

This directory contains examples demonstrating different ways to use the SAP Endpoint Generator.

## Examples Overview

### 1. Basic Usage (`basic-usage.ts`)

The simplest way to generate a quote endpoint with minimal configuration.

**Run it:**
```bash
npx ts-node examples/basic-usage.ts
```

**What it demonstrates:**
- Basic endpoint generation
- Minimal configuration
- Default settings
- File output structure

**Use this when:**
- Getting started
- Creating simple endpoints
- Learning the basics

---

### 2. Advanced Usage (`advanced-usage.ts`)

Demonstrates complex business logic, multiple custom fields, and advanced features.

**Run it:**
```bash
npx ts-node examples/advanced-usage.ts
```

**What it demonstrates:**
- Complex custom fields (14 fields)
- Priority-based discounts
- Promotional code handling
- Approval workflows
- Warranty pricing
- Validation rules
- Email notifications
- Audit logging

**Use this when:**
- Building production systems
- Implementing complex business rules
- Working with extensive customizations
- Need approval workflows

---

### 3. Programmatic Usage (`programmatic-usage.ts`)

Shows how to use the generator programmatically in your own applications using the Claude Agent SDK directly.

**Run it:**
```bash
npx ts-node examples/programmatic-usage.ts
```

**What it demonstrates:**
- Direct SDK usage
- Custom MCP server registration
- Agent configuration
- Streaming message handling
- Progress tracking
- Error handling

**Use this when:**
- Integrating into your application
- Building custom workflows
- Need fine-grained control
- Want to customize the generation process

---

## Sample SAP Configuration Files

The `sample-sap-config/` directory contains example SAP configuration files:

### `VBAK_structure.txt`
SAP Sales Document Header table structure with:
- Standard SAP fields
- Custom Z fields
- Field descriptions

### `VBAP_structure.txt`
SAP Sales Document Item table structure with:
- Line item fields
- Item-level custom fields

### `custom_fields.txt`
Detailed custom field documentation with:
- Field definitions
- Usage notes
- Business logic descriptions
- Z-table definitions

## Running the Examples

### Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up API key:**
   ```bash
   export ANTHROPIC_API_KEY='your-api-key'
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

### Running Individual Examples

**TypeScript (development):**
```bash
npx ts-node examples/basic-usage.ts
npx ts-node examples/advanced-usage.ts
npx ts-node examples/programmatic-usage.ts
```

**JavaScript (after build):**
```bash
node dist/examples/basic-usage.js
node dist/examples/advanced-usage.js
node dist/examples/programmatic-usage.js
```

### Running All Examples

```bash
# Run basic example
npm run example:basic

# Run advanced example
npm run example:advanced

# Run programmatic example
npm run example:programmatic
```

## Modifying Examples

### Change Customer Name

```typescript
const request: GenerateEndpointRequest = {
  customerName: 'your-company-name',  // Change this
  // ...
};
```

### Change SAP Version

```typescript
const request: GenerateEndpointRequest = {
  sapVersion: 'S4HANA',  // R3, ECC6, or S4HANA
  // ...
};
```

### Add Custom Fields

```typescript
const request: GenerateEndpointRequest = {
  requirements: {
    customFields: {
      'ZZMYFIELD': 'My custom field description',
      'ZZANOTHERFIELD': 'Another custom field'
    }
  }
};
```

### Change Output Directory

```typescript
const request: GenerateEndpointRequest = {
  outputDir: './my-output-dir',
  // ...
};
```

## Expected Output

After running an example, you'll find generated files in `./output/{customer-name}/`:

```
output/
└── {customer-name}/
    ├── analysis.json                           # SAP analysis results
    ├── Z_CREATE_QUOTE_{CUSTOMER}.abap         # Function module
    ├── Z{CUSTOMER}_QUOTE_SRV.xml              # OData service
    ├── ZCL_{CUSTOMER}_QUOTE_DPC_EXT.abap     # Data provider class
    ├── ZCL_{CUSTOMER}_QUOTE_MPC_EXT.abap     # Model provider class
    ├── DEPLOYMENT_GUIDE.md                     # Deployment instructions
    └── tests/
        ├── Z_CREATE_QUOTE_{CUSTOMER}_TEST.abap
        ├── integration_tests.md
        └── {customer}_quote_api_tests.json
```

## Next Steps

1. **Review generated code** - Check the output files
2. **Read DEPLOYMENT_GUIDE.md** - Understand deployment steps
3. **Test the code** - Run the included tests
4. **Deploy to SAP** - Follow the deployment guide
5. **Customize further** - Modify templates or add features

## Troubleshooting

### Example Won't Run

**Error**: `Cannot find module '@anthropic-ai/claude-agent-sdk'`

**Solution**:
```bash
npm install
```

### API Key Error

**Error**: `Missing Anthropic API key`

**Solution**:
```bash
export ANTHROPIC_API_KEY='your-key-here'
```

### Config Files Not Found

**Error**: `Configuration file not found`

**Solution**: Ensure you're running from the project root:
```bash
cd /path/to/sap-agent
npx ts-node examples/basic-usage.ts
```

### Generation Fails

**Check**:
- API key is valid
- Internet connection is working
- Config files are properly formatted
- You have write permissions to output directory

## Creating Your Own Example

1. **Copy an existing example:**
   ```bash
   cp examples/basic-usage.ts examples/my-example.ts
   ```

2. **Modify the configuration:**
   ```typescript
   const request: GenerateEndpointRequest = {
     // Your customizations
   };
   ```

3. **Run it:**
   ```bash
   npx ts-node examples/my-example.ts
   ```

## Contributing Examples

Have a useful example? We'd love to include it!

1. Create your example in this directory
2. Add documentation here
3. Submit a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for details.

## Support

Need help with the examples?

- Check the [README](../README.md)
- Read [GETTING_STARTED](../GETTING_STARTED.md)
- Open an issue on GitHub

---

Happy generating! 🚀
