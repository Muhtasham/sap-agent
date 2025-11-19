# SAP Endpoint Generator - Pilot Quick Start Guide

> Get from zero to production-ready SAP code in 30 minutes

This guide will help you quickly start generating production-ready SAP ABAP code using AI-powered multi-agent architecture.

## 📋 Prerequisites

- **Node.js 18+** installed on your machine
- **Anthropic API key** (get one at https://console.anthropic.com/)
- **SAP system access** to export table structures (SE11)
- **Basic familiarity** with SAP ABAP and OData concepts

---

## 🚀 Step 1: Installation (5 minutes)

### Clone the Repository

```bash
git clone https://github.com/your-org/sap-agent.git
cd sap-agent
```

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

### Configure API Key

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Anthropic API key
# ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Edit the `.env` file with your favorite text editor and replace the API key.

---

## 📝 Step 2: Prepare SAP Configuration (10 minutes)

You need to export configuration from your SAP system. Create a directory for your config files:

```bash
mkdir sap-config
```

### Export Table Structure from SAP (SE11)

In SAP transaction **SE11**, view your table structure and copy the field definitions.

**Create: `sap-config/VBAK_structure.txt`**

```
Table: VBAK
Sales Document Header Data

Field       Data Type  Length  Description
MANDT       CLNT       3       Client
VBELN       CHAR       10      Sales Document Number
ERDAT       DATS       8       Date on which record was created
KUNNR       CHAR       10      Sold-to party
WAERK       CUKY       5       SD document currency
NETWR       CURR       15,2    Net Value of the Sales Order
```

### Document Custom Fields

**Create: `sap-config/custom_fields.txt`**

```
Table: VBAK
Custom Fields

ZZPRIORITY  NUMC       1       Priority Level (1-5)
ZZREFERRAL  CHAR       20      Referral Source
ZZREGION    CHAR       10      Sales Region
```

> **Tip:** You can include multiple tables in separate files or combine them. The generator will parse all provided files.

---

## 🎯 Step 3: Generate Your First Endpoint (2 minutes)

### Option A: Using the CLI (Recommended for First Try)

```bash
npx sap-generate quote \
  --customer acme-corp \
  --sap-version ECC6 \
  --config-files sap-config/VBAK_structure.txt sap-config/custom_fields.txt \
  --fields customer_id quote_date valid_until total_amount currency \
  --custom-fields '{"ZZPRIORITY":"Priority level","ZZREFERRAL":"Referral source"}' \
  --special-logic "Apply 10% discount for VIP customers with ZZPRIORITY = 1"
```

**Parameters explained:**
- `--customer` - Your customer identifier (lowercase, no spaces)
- `--sap-version` - Your SAP version (R3, ECC6, or S4HANA)
- `--config-files` - Paths to your SAP configuration files
- `--fields` - Required fields for the quote endpoint
- `--custom-fields` - Custom Z-fields and their descriptions (JSON format)
- `--special-logic` - Business logic in plain English

### Option B: Using the API Server (For Web Integration)

```bash
# Start the API server
npm run serve
```

Then open your browser to:
- **Swagger UI:** http://localhost:3000/api-docs
- **Interactive API testing** with examples

Or make a direct API call:

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "acme-corp",
    "sap_version": "ECC6",
    "config_files": {
      "VBAK_structure.txt": "Table: VBAK\nField Data Type Length Description\nVBELN CHAR 10 Document Number"
    },
    "quote_fields": ["customer_id", "quote_date", "total_amount"],
    "custom_fields": {"ZZPRIORITY": "Priority level"},
    "special_logic": "Apply 10% discount for VIP customers"
  }'
```

---

## 📦 Step 4: Review Generated Code (5 minutes)

Your generated code will be in: `output/acme-corp/`

### Generated Files

```
output/acme-corp/
├── analysis.json                      # SAP system analysis
├── Z_CREATE_QUOTE_ACME.abap          # Function module
├── ZACME_QUOTE_SRV.xml               # OData service definition
├── ZCL_ACME_QUOTE_DPC_EXT.abap      # Data provider class (OData)
├── ZCL_ACME_QUOTE_MPC_EXT.abap      # Model provider class (OData)
├── DEPLOYMENT_GUIDE.md               # Step-by-step deployment instructions
└── tests/
    ├── Z_CREATE_QUOTE_ACME_TEST.abap # ABAP unit tests
    ├── integration_tests.md           # Integration test scenarios
    └── acme_quote_api_tests.json     # Postman collection
```

### What You Get

**✅ Production-Ready ABAP Code**
- Function module with error handling
- Authorization checks
- Transaction safety (COMMIT WORK / ROLLBACK WORK)
- SAP naming conventions (Z-namespace)
- Comprehensive documentation

**✅ Complete OData Service**
- Service definition XML
- Data Provider Class (DPC)
- Model Provider Class (MPC)
- RESTful API endpoints

**✅ Testing Suite**
- ABAP unit tests
- Integration test scenarios
- Postman API collection

**✅ Deployment Documentation**
- Step-by-step SAP Basis instructions
- Transaction codes needed
- Security authorization setup
- Troubleshooting guide

---

## 🔄 Step 5: Session Management (Advanced)

### Save Session IDs for Resumption

When you run a generation, you'll see:

```
📋 Session ID: abc-123-xyz-789
   (Save this ID to resume the session later)
```

**Save this ID!** You can use it to:

### Resume Interrupted Generation

```bash
npx sap-generate quote \
  --resume abc-123-xyz-789 \
  --customer acme-corp \
  --sap-version ECC6 \
  --config-files sap-config/*.txt \
  --fields customer_id quote_date total_amount
```

### Fork to Try Different Approach

```bash
npx sap-generate quote \
  --resume abc-123-xyz-789 \
  --fork \
  --customer acme-corp \
  --sap-version ECC6 \
  --config-files sap-config/*.txt \
  --special-logic "Try a different validation approach"
```

**When to use:**
- ❌ Generation got interrupted → Use `--resume` (without `--fork`)
- 🔀 Want to explore alternative implementation → Use `--resume --fork`

---

## 💡 Pro Tips

### 1. Start Simple, Then Iterate

**First Generation - Basic:**
```bash
npx sap-generate quote \
  --customer test \
  --sap-version ECC6 \
  --config-files sap-config/VBAK.txt \
  --fields customer_id quote_date total_amount
```

**Second Generation - Add Complexity:**
```bash
npx sap-generate quote \
  --customer test-v2 \
  --sap-version ECC6 \
  --config-files sap-config/VBAK.txt sap-config/custom_fields.txt \
  --fields customer_id quote_date total_amount currency \
  --custom-fields '{"ZZPRIORITY":"Priority level"}' \
  --special-logic "Complex business rules here"
```

### 2. Use the Right SAP Version

```bash
--sap-version R3        # For SAP R/3 (older systems)
--sap-version ECC6      # For SAP ECC 6.0 (most common)
--sap-version S4HANA    # For SAP S/4HANA (newest)
```

The generator adapts code syntax and features based on your SAP version.

### 3. Leverage Custom Business Logic

The `--special-logic` parameter is powerful! Describe complex requirements in plain English:

```bash
--special-logic "
- Check customer credit limit before creating quote
- Apply tiered discounts: 5% for orders >10K, 10% for orders >50K
- Send email notification to sales manager for quotes >100K
- Automatically approve quotes under 5K
- Integrate with external pricing engine for custom products
"
```

The AI agents will implement this logic in production-ready ABAP!

### 4. Download Generated Code

If using the API server:

```bash
# Download as tar.gz archive
curl http://localhost:3000/api/download/acme-corp -o acme-corp-code.tar.gz

# Extract
tar -xzf acme-corp-code.tar.gz
```

### 5. Test Before Deploying

```bash
# The generator creates ABAP unit tests
# Upload to your development system and run:
# SE37 → Z_CREATE_QUOTE_ACME → Test → Execute

# Or use the generated test class:
# SE80 → Import → Z_CREATE_QUOTE_ACME_TEST
```

---

## 🏗️ Architecture Overview

### Multi-Agent System

You get **4 specialized AI agents** working together:

1. **Context Analyzer** - Analyzes SAP configuration and requirements
2. **Code Generator** - Writes production-ready ABAP code
3. **Test Generator** - Creates comprehensive test suites
4. **Deployment Guide** - Writes step-by-step deployment docs

### MCP Tools (Behind the Scenes)

These tools run automatically during generation:

- `parse_sap_table` - Parses table structures from DDIC exports
- `validate_abap_syntax` - Validates generated ABAP code
- `generate_odata_metadata` - Creates OData service metadata
- `extract_sap_customizations` - Identifies custom fields and logic

**You don't configure these - they just work!**

---

## 📊 Expected Costs

### API Costs (Anthropic Claude)

- **Per generation:** $1-3 (depending on complexity)
- **Pilot phase (10 generations):** ~$20-30

### Time Savings

- **Manual coding time:** 2-3 days per endpoint
- **AI-generated time:** 5-15 minutes
- **ROI:** ~95% time savings

---

## 🆘 Troubleshooting

### Generation Failed

**Check:**
1. ✅ ANTHROPIC_API_KEY is set correctly in `.env`
2. ✅ Config files are properly formatted
3. ✅ Customer name is lowercase (e.g., `acme-corp` not `Acme Corp`)
4. ✅ SAP version is valid (R3, ECC6, or S4HANA)

### Session Not Found

**Fix:**
- Session IDs expire after some time
- Start a new generation if session is old

### Code Doesn't Compile in SAP

**Steps:**
1. Check the generated `DEPLOYMENT_GUIDE.md`
2. Ensure you're using the correct SAP version flag
3. Review the syntax validation output
4. Check for missing authorization objects

---

## 📚 Next Steps

### Explore Examples

```bash
# View example configurations
ls examples/

# Run example generation
npm run example:basic
npm run example:advanced
```

### Read Full Documentation

- `README.md` - Complete feature list and usage
- `DEPLOYMENT.md` - Production deployment options
- `CONTRIBUTING.md` - Extend the generator
- `CHANGELOG.md` - Version history

### API Integration

For integrating into your own web application:

```bash
# Start server
npm run serve

# Access Swagger docs
open http://localhost:3000/api-docs

# Integrate with your frontend
# Example: React, Angular, Vue.js
```

---

## 🎯 Success Metrics

After completing this guide, you should have:

- ✅ Generated your first SAP endpoint (5-15 minutes)
- ✅ Production-ready ABAP code
- ✅ Complete test suite
- ✅ Deployment documentation
- ✅ Understanding of session management
- ✅ Ability to iterate and improve

**Time to value: ~30 minutes from clone to production code!**

---

## 💬 Support

### Get Help

- **Documentation:** Check README.md and other docs in the repo
- **API Docs:** http://localhost:3000/api-docs when server is running
- **Issues:** GitHub Issues for bug reports
- **Examples:** See `examples/` directory for working samples

### Provide Feedback

We're in pilot phase and want your feedback!

- What works well?
- What's confusing?
- What features are missing?
- What would make this more valuable?

---

## 🚀 Quick Reference

### Most Common Commands

```bash
# Generate quote endpoint
npx sap-generate quote --customer <name> --sap-version <version> --config-files <files>

# Start API server
npm run serve

# Resume session
npx sap-generate quote --resume <session-id> --customer <name> ...

# Fork session
npx sap-generate quote --resume <session-id> --fork --customer <name> ...

# Validate config files
npx sap-generate validate --files sap-config/*.txt

# Initialize project with examples
npx sap-generate init
```

### SAP Versions

- `R3` - SAP R/3
- `ECC6` - SAP ECC 6.0 (most common)
- `S4HANA` - SAP S/4HANA

### File Structure

```
sap-agent/
├── sap-config/           # Your SAP configuration files
├── output/              # Generated code (one folder per customer)
├── examples/            # Example configurations
├── .env                 # Your API key (never commit!)
└── README.md            # Full documentation
```

---

**Ready to generate production SAP code in minutes instead of days? Let's go! 🚀**
