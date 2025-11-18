# Getting Started with SAP Endpoint Generator

This guide will walk you through generating your first SAP quote creation endpoint from scratch.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or later)
2. **SAP System Access** (to export table structures)
3. **Basic SAP Knowledge** (SE11, SE37, SEGW transactions)
4. **Anthropic API Key** (for Claude Agent SDK)

## Step 1: Installation

```bash
# Clone the repository
git clone <repository-url>
cd sap-agent

# Install dependencies
npm install

# Build the project
npm run build

# Verify installation
npx sap-generate --version
```

## Step 2: Set Up Your Environment

### Configure API Key

The generator uses Claude Agent SDK which requires an Anthropic API key:

```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```

Or add it to your `.env` file:

```bash
echo "ANTHROPIC_API_KEY=your-api-key-here" > .env
```

### Initialize Your Project

Create a new directory for your SAP configuration:

```bash
npx sap-generate init --directory ./my-sap-project
cd my-sap-project
```

This creates:
- `sap-config/` directory with example files
- `example-command.sh` with a sample generation command

## Step 3: Gather SAP Configuration

You need to export your SAP table structures and custom field definitions.

### Export Table Structure (SE11)

1. Open transaction **SE11** in SAP
2. Enter table name: **VBAK** (Sales Document Header)
3. Click **Display**
4. Go to **Utilities → Table Contents → Export**
5. Save as `VBAK_structure.txt`

Alternatively, use this format:

```
Table: VBAK
Sales Document Header Data

Field         Data Type  Length  Description
* MANDT       CLNT       3       Client
* VBELN       CHAR       10      Sales Document
ERDAT         DATS       8       Creation Date
AUDAT         DATS       8       Document Date
KUNNR         CHAR       10      Sold-to Party
WAERK         CUKY       5       Currency
NETWR         CURR       15,2    Net Value
VKORG         CHAR       4       Sales Organization
VTWEG         CHAR       2       Distribution Channel
SPART         CHAR       2       Division
```

### Document Custom Fields

Create `custom_fields.txt`:

```
Table: VBAK
Custom Fields

Field Name     Type  Length  Description
ZZPRIORITY     NUMC  1       Customer Priority (1-5)
ZZREFERRAL     CHAR  20      Referral Source
ZZREGION       CHAR  10      Sales Region
```

### Optional: Export VBAP (Line Items)

Repeat the process for **VBAP** if your quotes include line items.

## Step 4: Generate Your First Endpoint

### Basic Generation

Run the generator with minimal configuration:

```bash
npx sap-generate quote \
  --customer mycompany \
  --sap-version ECC6 \
  --config-files sap-config/VBAK_structure.txt sap-config/custom_fields.txt \
  --fields customer_id quote_date valid_until total_amount currency
```

### With Custom Fields and Logic

Add custom fields and business logic:

```bash
npx sap-generate quote \
  --customer mycompany \
  --sap-version ECC6 \
  --config-files sap-config/VBAK_structure.txt sap-config/custom_fields.txt \
  --fields customer_id quote_date valid_until total_amount currency \
  --custom-fields '{"ZZPRIORITY":"Customer priority level (1-5)","ZZREFERRAL":"Referral source code"}' \
  --special-logic "Apply automatic 10% discount for priority 1 customers"
```

### What Happens Next

The generator will:

1. **Analyze** your SAP configuration files
2. **Generate** ABAP function module
3. **Create** OData service definition
4. **Build** DPC and MPC extension classes
5. **Write** comprehensive tests
6. **Compile** deployment documentation

This typically takes 2-5 minutes.

## Step 5: Review Generated Code

Navigate to the output directory:

```bash
cd output/mycompany
ls -la
```

You should see:

```
.
├── analysis.json                          # SAP system analysis
├── Z_CREATE_QUOTE_MYCOMPANY.abap         # Function module
├── ZMYCOMPANY_QUOTE_SRV.xml              # OData service
├── ZCL_MYCOMPANY_QUOTE_DPC_EXT.abap     # Data provider class
├── ZCL_MYCOMPANY_QUOTE_MPC_EXT.abap     # Model provider class
├── DEPLOYMENT_GUIDE.md                    # Deployment instructions
└── tests/
    ├── Z_CREATE_QUOTE_MYCOMPANY_TEST.abap
    ├── integration_tests.md
    └── mycompany_quote_api_tests.json
```

### Review Checklist

- [ ] Open `analysis.json` - verify all custom fields were detected
- [ ] Read `Z_CREATE_QUOTE_MYCOMPANY.abap` - check the function module logic
- [ ] Review `DEPLOYMENT_GUIDE.md` - understand deployment steps
- [ ] Check `tests/` - ensure test coverage is adequate

## Step 6: Deploy to SAP

Follow the deployment guide step-by-step:

```bash
cat DEPLOYMENT_GUIDE.md
```

### Quick Deployment Overview

1. **Create Transport Request** (SE09)
   - Create workbench request
   - Note the transport number

2. **Create Function Module** (SE37)
   - Copy code from `Z_CREATE_QUOTE_MYCOMPANY.abap`
   - Define parameters
   - Activate

3. **Test Function Module** (SE37)
   - Execute with test data
   - Verify quote creation

4. **Create OData Service** (SEGW)
   - Create project
   - Import service definition
   - Generate runtime objects

5. **Implement Extension Classes** (SE24)
   - Copy DPC_EXT code
   - Copy MPC_EXT code
   - Activate both

6. **Register Service** (/IWFND/MAINT_SERVICE)
   - Add service
   - Test metadata

7. **Activate ICF** (SICF)
   - Activate the service endpoint

8. **Configure Authorization** (PFCG)
   - Create role
   - Assign users

9. **Test API** (Postman)
   - Import test collection
   - Run API tests

## Step 7: Test the Endpoint

### Test with Postman

1. Import the generated Postman collection:
   ```
   tests/mycompany_quote_api_tests.json
   ```

2. Configure environment variables:
   - `baseUrl`: Your SAP Gateway URL
   - `username`: SAP username
   - `password`: SAP password

3. Run the test collection

### Test with cURL

```bash
curl -X POST \
  'https://your-sap-server:8000/sap/opu/odata/sap/ZMYCOMPANY_QUOTE_SRV/QuoteSet' \
  -H 'Content-Type: application/json' \
  -u 'username:password' \
  -d '{
    "CustomerId": "0000001000",
    "QuoteDate": "/Date(1642204800000)/",
    "ValidUntil": "/Date(1644883200000)/",
    "SalesOrg": "1000",
    "DistChannel": "10",
    "Division": "00"
  }'
```

Expected response:

```json
{
  "d": {
    "QuoteNumber": "0000012345",
    "CustomerId": "0000001000",
    "QuoteDate": "/Date(1642204800000)/",
    "ValidUntil": "/Date(1644883200000)/",
    "Status": "A",
    "TotalAmount": "0.00",
    "Currency": "USD"
  }
}
```

## Step 8: Verify in SAP

1. Open transaction **VA23** (Display Quote)
2. Enter the quote number from the API response
3. Verify all fields are populated correctly
4. Check custom fields (ZZPRIORITY, ZZREFERRAL)

## Common Issues and Solutions

### Issue: Config file not found

**Error**: `Configuration file not found: sap-config/VBAK_structure.txt`

**Solution**:
- Verify file exists: `ls sap-config/`
- Check file path is correct
- Use absolute paths if needed

### Issue: Invalid SAP version

**Error**: `SAP version must be R3, ECC6, or S4HANA`

**Solution**: Use correct version string (case-insensitive):
```bash
--sap-version ECC6
```

### Issue: Custom fields JSON error

**Error**: `Custom fields must be valid JSON`

**Solution**: Ensure proper JSON formatting:
```bash
--custom-fields '{"FIELD":"Description"}'
```

Note the single quotes around the JSON string.

### Issue: No custom fields detected

**Problem**: `customFieldCount: 0` in analysis.json

**Solution**:
- Ensure custom fields start with ZZ or YY
- Check fields are listed in config files
- Verify file format matches examples

### Issue: Function module syntax error

**Problem**: ABAP syntax errors in generated code

**Solution**:
- Check the validation warnings
- Review SAP version compatibility
- Manually adjust for specific SAP patches

## Next Steps

Now that you have your first endpoint working:

1. **Extend Functionality**
   - Add line item support
   - Implement pricing logic
   - Add approval workflows

2. **Generate More Endpoints**
   - Order creation
   - Customer management
   - Inventory queries

3. **Integrate with Applications**
   - Build front-end applications
   - Connect to mobile apps
   - Integrate with third-party systems

4. **Monitor and Optimize**
   - Track API usage
   - Monitor performance
   - Gather user feedback

## Learning Resources

### SAP Transactions Reference

- **SE11**: Data Dictionary (table structures)
- **SE37**: Function Builder (create/test function modules)
- **SE24**: Class Builder (create/edit classes)
- **SE80**: Object Navigator (overall development)
- **SEGW**: Service Builder (OData services)
- **SICF**: HTTP Service (activate services)
- **PFCG**: Role Maintenance (authorization)
- **SE09/SE10**: Transport Organizer

### OData Resources

- [SAP OData Documentation](https://help.sap.com/viewer/68bf513362174d54b58cddec28794093/)
- [OData Protocol Specification](https://www.odata.org/)

### ABAP Resources

- [ABAP Keyword Documentation](https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/index.htm)
- [SAP ABAP Development](https://developers.sap.com/topics/abap-platform.html)

## Getting Help

If you encounter issues:

1. **Check the Deployment Guide** - Most common issues are covered
2. **Review Generated Code** - Look for validation warnings
3. **Test Step-by-Step** - Isolate the problem
4. **Check SAP Logs** - ST22, SLG1, /IWFND/ERROR_LOG
5. **Ask for Help** - Create a GitHub issue

## Conclusion

Congratulations! You've successfully:

- ✅ Installed the SAP Endpoint Generator
- ✅ Gathered SAP configuration
- ✅ Generated your first endpoint
- ✅ Deployed to SAP
- ✅ Tested the API

You're now ready to generate endpoints for any SAP business process. Happy coding!

---

Next: Read [DOCS.MD](./DOCS.MD) for detailed documentation on all features and advanced usage.
