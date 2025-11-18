/**
 * Core type definitions for SAP Endpoint Generator
 */

export type SAPVersion = 'R3' | 'ECC6' | 'S4HANA';

export interface SAPField {
  name: string;
  dataType: string;
  length?: number;
  decimals?: number;
  description?: string;
  isKey?: boolean;
  isCustom?: boolean;
  nullable?: boolean;
}

export interface SAPTable {
  tableName: string;
  description?: string;
  fields: SAPField[];
  keys: string[];
  customFields: SAPField[];
}

export interface SAPBAPI {
  name: string;
  description?: string;
  importing?: SAPParameter[];
  exporting?: SAPParameter[];
  tables?: SAPParameter[];
}

export interface SAPParameter {
  name: string;
  type: string;
  optional?: boolean;
  description?: string;
}

export interface SAPCustomization {
  tables: SAPTable[];
  customFields: Record<string, SAPField[]>;
  bapis: SAPBAPI[];
  userExits: string[];
  pricingProcedures?: string[];
}

export interface GenerateEndpointRequest {
  customerName: string;
  sapVersion: SAPVersion;
  configFiles: string[];
  requirements: {
    quoteFields: string[];
    customFields?: Record<string, string>;
    specialLogic?: string;
  };
  outputDir?: string;
  // Session management
  resume?: string;        // Session ID to resume from
  forkSession?: boolean;  // Whether to fork (true) or continue (false) the session
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ODataProperty {
  name: string;
  type: string;
  nullable?: boolean;
  maxLength?: number;
}

export interface ODataEntity {
  name: string;
  properties: ODataProperty[];
  keys: string[];
}

export interface CodeGenerationResult {
  functionModule: string;
  odataService: string;
  dpcClass: string;
  mpcClass: string;
  tests: string;
  deploymentGuide: string;
}
