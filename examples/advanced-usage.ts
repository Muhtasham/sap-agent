/**
 * Advanced Usage Example
 * Demonstrates advanced features including custom fields and business logic
 */

import { generateQuoteEndpoint } from '../src/index';
import { GenerateEndpointRequest } from '../src/types';
import * as path from 'path';

async function advancedExample() {
  console.log('=== Advanced SAP Endpoint Generator Example ===\n');

  const request: GenerateEndpointRequest = {
    customerName: 'vip-client',
    sapVersion: 'S4HANA',

    configFiles: [
      path.join(__dirname, 'sample-sap-config/VBAK_structure.txt'),
      path.join(__dirname, 'sample-sap-config/VBAP_structure.txt'),
      path.join(__dirname, 'sample-sap-config/custom_fields.txt'),
    ],

    requirements: {
      // All quote fields
      quoteFields: [
        'customer_id',
        'quote_date',
        'valid_from',
        'valid_until',
        'sales_org',
        'distribution_channel',
        'division',
        'line_items',
        'total_amount',
        'currency',
        'payment_terms',
        'incoterms'
      ],

      // Custom fields with descriptions
      customFields: {
        'ZZPRIORITY': 'Customer priority level (1=Highest VIP, 5=Standard)',
        'ZZREFERRAL': 'Referral source code (e.g., PARTNER_ABC, GOOGLE_ADS)',
        'ZZREGION': 'Sales region code (NORTH, SOUTH, EAST, WEST, INTL)',
        'ZZLEADSOURCE': 'Detailed lead source description',
        'ZZPROMO': 'Promotional code applied to quote',
        'ZZCONTACT': 'Primary contact person name',
        'ZZEMAIL': 'Customer email for quote confirmation',
        'ZZPHONE': 'Customer phone number',
        'ZZPAYTERMS': 'Custom payment terms override',
        'ZZAPPROVER': 'User ID if approval required (triggers workflow)',

        // Item-level custom fields
        'ZZWARRANTY': 'Warranty period in months (item level)',
        'ZZINSTALL': 'Installation required flag (item level)',
        'ZZGIFTBOX': 'Gift packaging required (item level)',
        'ZZURGENT': 'Urgent delivery flag (item level)'
      },

      // Complex business logic
      specialLogic: `
Apply the following business rules:

1. PRIORITY-BASED DISCOUNTS:
   - Priority 1 (VIP): Automatic 15% discount on all items
   - Priority 2 (Gold): Automatic 10% discount on all items
   - Priority 3 (Silver): Automatic 5% discount on all items
   - Priority 4-5 (Standard): No automatic discount

2. PROMOTIONAL CODES:
   - SUMMER2024: 20% discount (cannot combine with priority discount)
   - NEWCUST10: 10% discount for new customers
   - PARTNER15: 15% discount for partner referrals
   - Item-level promo codes override header-level codes

3. APPROVAL WORKFLOW:
   - Quotes with ZZAPPROVER field populated require approval
   - Create entry in ZQUOTE_APPROVAL table
   - Send email notification to approver
   - Quote cannot be converted to order until approved

4. WARRANTY PRICING:
   - Standard warranty (12 months): Included
   - Extended warranty (24 months): Add 5% to item price
   - Extended warranty (36 months): Add 10% to item price

5. INSTALLATION:
   - If ZZINSTALL = 'X', add $500 installation fee per item
   - Urgent delivery (ZZURGENT = 'X') adds 25% expedite fee

6. VALIDATION RULES:
   - Valid until date must be at least 30 days from quote date
   - VIP customers (Priority 1) get 90-day validity
   - Total quote value > $50,000 requires approval
   - Email must be valid format if provided

7. NOTIFICATION:
   - Send email to ZZEMAIL with quote confirmation
   - CC the account manager (ZZCONTACT)
   - Include PDF attachment of quote

8. LOGGING:
   - Log all quote creation to ZQUOTE_LOG table
   - Include timestamp, user, customer, total value
   - Track referral source for analytics
      `.trim()
    },

    outputDir: './output/vip-client'
  };

  try {
    console.log('Starting advanced generation with complex business logic...\n');
    console.log('This may take a few minutes due to complexity...\n');

    const { messages, result } = await generateQuoteEndpoint(request);

    console.log('\n✅ Advanced generation completed successfully!');
    console.log(`\nGenerated files can be found in: ${request.outputDir}/`);

    console.log('\n📋 Special features implemented:');
    console.log('  ✓ Priority-based automatic discounts');
    console.log('  ✓ Promotional code handling');
    console.log('  ✓ Multi-level approval workflow');
    console.log('  ✓ Dynamic warranty pricing');
    console.log('  ✓ Installation and urgency fees');
    console.log('  ✓ Complex validation rules');
    console.log('  ✓ Email notifications');
    console.log('  ✓ Comprehensive audit logging');
    console.log('  ✓ 14 custom fields (header + item level)');

    console.log('\n💡 Review the generated code to see how all business rules are implemented!');

  } catch (error) {
    console.error('❌ Error during advanced generation:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  advancedExample().catch(console.error);
}

export { advancedExample };
