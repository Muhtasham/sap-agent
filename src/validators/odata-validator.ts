/**
 * OData schema validator
 * Validates OData service metadata and structure
 */

import { ValidationResult, ODataEntity, ODataProperty } from '../types';

export class ODataValidator {
  /**
   * Validate OData entity definition
   */
  static validateEntity(entity: ODataEntity): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check entity has a name
    if (!entity.name || entity.name.trim().length === 0) {
      errors.push('Entity must have a name');
    }

    // Check entity has properties
    if (!entity.properties || entity.properties.length === 0) {
      errors.push('Entity must have at least one property');
    }

    // Check entity has keys
    if (!entity.keys || entity.keys.length === 0) {
      errors.push('Entity must have at least one key property');
    }

    // Validate each property
    for (const prop of entity.properties) {
      this.validateProperty(prop, errors, warnings);
    }

    // Check that all keys exist in properties
    const propNames = new Set(entity.properties.map(p => p.name));
    for (const key of entity.keys) {
      if (!propNames.has(key)) {
        errors.push(`Key '${key}' is not defined in entity properties`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate OData property
   */
  private static validateProperty(
    property: ODataProperty,
    errors: string[],
    warnings: string[]
  ): void {
    // Check property has a name
    if (!property.name || property.name.trim().length === 0) {
      errors.push('Property must have a name');
      return;
    }

    // Check property has a type
    if (!property.type || property.type.trim().length === 0) {
      errors.push(`Property '${property.name}' must have a type`);
    }

    // Validate type is a valid OData type
    const validTypes = [
      'Edm.String',
      'Edm.Int16',
      'Edm.Int32',
      'Edm.Int64',
      'Edm.Decimal',
      'Edm.Double',
      'Edm.Boolean',
      'Edm.DateTime',
      'Edm.DateTimeOffset',
      'Edm.Time',
      'Edm.Guid',
      'Edm.Binary',
      'Edm.Byte',
    ];

    if (!validTypes.includes(property.type)) {
      warnings.push(`Property '${property.name}' has non-standard type: ${property.type}`);
    }

    // String types should have maxLength
    if (property.type === 'Edm.String' && !property.maxLength) {
      warnings.push(`String property '${property.name}' should have maxLength defined`);
    }
  }

  /**
   * Validate OData metadata XML
   */
  static validateMetadataXML(xml: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic XML structure checks
    if (!xml.includes('<?xml')) {
      errors.push('Missing XML declaration');
    }

    if (!xml.includes('<edmx:Edmx')) {
      errors.push('Missing edmx:Edmx root element');
    }

    if (!xml.includes('<Schema')) {
      errors.push('Missing Schema element');
    }

    if (!xml.includes('<EntityType')) {
      errors.push('Missing EntityType definition');
    }

    // Check for namespace declarations
    if (!xml.includes('xmlns:edmx=')) {
      errors.push('Missing edmx namespace declaration');
    }

    // Check for balanced tags
    const openTags = xml.match(/<[^/][^>]*>/g) || [];
    const closeTags = xml.match(/<\/[^>]*>/g) || [];
    const selfClosingTags = xml.match(/<[^>]*\/>/g) || [];

    const expectedCloseTags = openTags.length - (selfClosingTags?.length || 0);
    if (closeTags.length !== expectedCloseTags) {
      warnings.push('Possible unbalanced XML tags');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Map SAP ABAP type to OData EDM type
   */
  static mapAbapTypeToOData(abapType: string, length?: number, decimals?: number): string {
    const typeMap: Record<string, string> = {
      'CHAR': 'Edm.String',
      'NUMC': 'Edm.String',
      'STRING': 'Edm.String',
      'INT1': 'Edm.Byte',
      'INT2': 'Edm.Int16',
      'INT4': 'Edm.Int32',
      'INT8': 'Edm.Int64',
      'DEC': 'Edm.Decimal',
      'CURR': 'Edm.Decimal',
      'QUAN': 'Edm.Decimal',
      'FLTP': 'Edm.Double',
      'DATS': 'Edm.DateTime',
      'TIMS': 'Edm.Time',
      'TIMESTAMP': 'Edm.DateTimeOffset',
      'RAW': 'Edm.Binary',
      'RAWSTRING': 'Edm.Binary',
      'BOOLEAN': 'Edm.Boolean',
      'ABAP_BOOL': 'Edm.Boolean',
    };

    return typeMap[abapType.toUpperCase()] || 'Edm.String';
  }
}
