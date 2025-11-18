#!/usr/bin/env node
/**
 * SAP Endpoint Generator - CLI Tool
 */

import { Command } from 'commander';
import { generateQuoteEndpoint } from './index';
import { GenerateEndpointRequest, SAPVersion } from './types';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('sap-generate')
  .description('Generate SAP quote creation endpoints using AI')
  .version('1.0.0');

program
  .command('quote')
  .description('Generate quote creation endpoint')
  .requiredOption('-c, --customer <name>', 'Customer name (lowercase, no spaces)')
  .requiredOption(
    '-v, --sap-version <version>',
    'SAP version (R3, ECC6, or S4HANA)'
  )
  .requiredOption(
    '-f, --config-files <files...>',
    'SAP configuration file paths (space-separated)'
  )
  .option('-o, --output <dir>', 'Output directory', './output')
  .option(
    '--fields <fields...>',
    'Required quote fields',
    'customer_id quote_date valid_until total_amount currency'.split(' ')
  )
  .option('--custom-fields <json>', 'Custom fields as JSON string')
  .option('--special-logic <text>', 'Special business logic description')
  .action(async (options) => {
    try {
      // Validate customer name
      if (!/^[a-z0-9_-]+$/.test(options.customer)) {
        console.error(
          'Error: Customer name must be lowercase alphanumeric with optional underscores/hyphens'
        );
        process.exit(1);
      }

      // Validate SAP version
      const sapVersion = options.sapVersion.toUpperCase() as SAPVersion;
      if (!['R3', 'ECC6', 'S4HANA'].includes(sapVersion)) {
        console.error('Error: SAP version must be R3, ECC6, or S4HANA');
        process.exit(1);
      }

      // Validate config files exist
      for (const file of options.configFiles) {
        if (!fs.existsSync(file)) {
          console.error(`Error: Configuration file not found: ${file}`);
          process.exit(1);
        }
      }

      // Parse custom fields if provided
      let customFields: Record<string, string> | undefined;
      if (options.customFields) {
        try {
          customFields = JSON.parse(options.customFields);
        } catch (error) {
          console.error(
            'Error: Custom fields must be valid JSON. Example: \'{"ZZFIELD":"Description"}\''
          );
          process.exit(1);
        }
      }

      // Build request
      const request: GenerateEndpointRequest = {
        customerName: options.customer,
        sapVersion,
        configFiles: options.configFiles,
        outputDir: options.output,
        requirements: {
          quoteFields: options.fields,
          customFields,
          specialLogic: options.specialLogic,
        },
      };

      // Generate endpoint
      console.log('Starting SAP endpoint generation...\n');
      await generateQuoteEndpoint(request);

      process.exit(0);
    } catch (error) {
      console.error('\nFatal error during generation:');
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new SAP project with example config files')
  .option('-d, --directory <dir>', 'Project directory', '.')
  .action((options) => {
    const projectDir = path.resolve(options.directory);
    const configDir = path.join(projectDir, 'sap-config');

    // Create directories
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      console.log(`✓ Created directory: ${configDir}`);
    }

    // Create example config files
    const exampleVBAK = `Table: VBAK
Sales Document Header Data

Field       Data Type  Length  Description
MANDT       CLNT       3       Client
VBELN       CHAR       10      Sales Document Number
ERDAT       DATS       8       Date on which record was created
ERZET       TIMS       6       Entry time
ERNAM       CHAR       12      Name of Person who Created the Object
AUDAT       DATS       8       Document Date
VBTYP       CHAR       1       Sales Document Type
KUNNR       CHAR       10      Sold-to party
WAERK       CUKY       5       SD document currency
NETWR       CURR       15,2    Net Value of the Sales Order
`;

    const exampleCustomFields = `Table: VBAK
Custom Fields

ZZPRIORITY  NUMC       1       Priority Level (1-5)
ZZREFERRAL  CHAR       20      Referral Source
ZZREGION    CHAR       10      Sales Region

Table: VBAP
Custom Fields

ZZWARRANTY  NUMC       2       Warranty Period (months)
ZZPROMO     CHAR       10      Promotion Code
`;

    fs.writeFileSync(path.join(configDir, 'VBAK_structure.txt'), exampleVBAK);
    console.log(`✓ Created: ${path.join(configDir, 'VBAK_structure.txt')}`);

    fs.writeFileSync(
      path.join(configDir, 'custom_fields.txt'),
      exampleCustomFields
    );
    console.log(`✓ Created: ${path.join(configDir, 'custom_fields.txt')}`);

    // Create example command
    const exampleCommand = `# Example: Generate quote endpoint for customer "acme"
sap-generate quote \\
  --customer acme \\
  --sap-version ECC6 \\
  --config-files sap-config/VBAK_structure.txt sap-config/custom_fields.txt \\
  --fields customer_id quote_date valid_until total_amount \\
  --custom-fields '{"ZZPRIORITY":"Priority level","ZZREFERRAL":"Referral source"}' \\
  --special-logic "Apply 10% discount for VIP customers"
`;

    fs.writeFileSync(path.join(projectDir, 'example-command.sh'), exampleCommand);
    console.log(`✓ Created: ${path.join(projectDir, 'example-command.sh')}`);

    console.log(`
✅ Project initialized successfully!

Next steps:
1. Edit the config files in ${configDir}/ with your SAP table structures
2. Review the example command in example-command.sh
3. Run: sap-generate quote --help for usage information
4. Generate your endpoint!
`);
  });

program
  .command('validate')
  .description('Validate SAP configuration files')
  .requiredOption('-f, --files <files...>', 'Config files to validate')
  .action((options) => {
    console.log('Validating SAP configuration files...\n');

    let allValid = true;

    for (const file of options.files) {
      console.log(`Checking: ${file}`);

      if (!fs.existsSync(file)) {
        console.log(`  ✗ File not found`);
        allValid = false;
        continue;
      }

      const content = fs.readFileSync(file, 'utf-8');

      // Basic validation
      if (content.trim().length === 0) {
        console.log(`  ✗ File is empty`);
        allValid = false;
        continue;
      }

      // Check for table definition
      if (!content.includes('Table:')) {
        console.log(`  ⚠ Warning: No table definition found`);
      }

      // Check for field definitions
      const fieldCount = (content.match(/\n\s*[A-Z][A-Z0-9_]+\s+/g) || []).length;
      console.log(`  ✓ Found ${fieldCount} field definitions`);

      // Check for custom fields
      const customFields = (content.match(/\n\s*[ZY]{2}[A-Z0-9_]+\s+/g) || [])
        .length;
      if (customFields > 0) {
        console.log(`  ✓ Found ${customFields} custom fields`);
      }

      console.log(`  ✓ Valid\n`);
    }

    if (allValid) {
      console.log('✅ All configuration files are valid');
      process.exit(0);
    } else {
      console.log('❌ Some configuration files have issues');
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
