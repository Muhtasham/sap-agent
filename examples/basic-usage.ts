/**
 * Basic Usage Example
 * Demonstrates the simplest way to use the SAP Endpoint Generator
 */

import { generateQuoteEndpoint } from '../src/index';
import { GenerateEndpointRequest } from '../src/types';
import * as path from 'path';

async function basicExample() {
  console.log('=== Basic SAP Endpoint Generator Example ===\n');

  // Define the request with minimal configuration
  const request: GenerateEndpointRequest = {
    customerName: 'demo-company',
    sapVersion: 'ECC6',

    // Path to your SAP configuration files
    configFiles: [
      path.join(__dirname, 'sample-sap-config/VBAK_structure.txt'),
      path.join(__dirname, 'sample-sap-config/custom_fields.txt'),
    ],

    // Basic requirements
    requirements: {
      quoteFields: [
        'customer_id',
        'quote_date',
        'valid_until',
        'total_amount',
        'currency'
      ]
    },

    // Optional: specify output directory
    outputDir: './output'
  };

  try {
    console.log('Starting generation...\n');

    // Generate the endpoint
    const { messages, result } = await generateQuoteEndpoint(request);

    console.log('\n✅ Generation completed successfully!');
    console.log(`\nGenerated files can be found in: ./output/${request.customerName}/`);

    // List generated files
    console.log('\nGenerated files:');
    console.log('  - analysis.json');
    console.log('  - Z_CREATE_QUOTE_DEMO_COMPANY.abap');
    console.log('  - ZDEMO_COMPANY_QUOTE_SRV.xml');
    console.log('  - ZCL_DEMO_COMPANY_QUOTE_DPC_EXT.abap');
    console.log('  - ZCL_DEMO_COMPANY_QUOTE_MPC_EXT.abap');
    console.log('  - DEPLOYMENT_GUIDE.md');
    console.log('  - tests/');
    console.log('    - Z_CREATE_QUOTE_DEMO_COMPANY_TEST.abap');
    console.log('    - integration_tests.md');
    console.log('    - demo_company_quote_api_tests.json');

  } catch (error) {
    console.error('❌ Error during generation:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  basicExample().catch(console.error);
}

export { basicExample };
