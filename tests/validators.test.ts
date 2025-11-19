/**
 * Tests for ABAP and OData validators
 */

import { ABAPSyntaxValidator } from '../src/validators/abap-syntax';
import { ODataValidator } from '../src/validators/odata-validator';
import { ODataEntity } from '../src/types';

describe('ABAPSyntaxValidator', () => {
  describe('validate', () => {
    it('should pass valid ABAP code', () => {
      const code = `
FUNCTION Z_TEST_FUNCTION.
  DATA: lv_value TYPE string.

  IF lv_value IS INITIAL.
    lv_value = 'test'.
  ENDIF.

  RETURN.
ENDFUNCTION.
      `;

      const result = ABAPSyntaxValidator.validate(code, 'ECC6');

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect unbalanced blocks', () => {
      const code = `
FUNCTION Z_TEST.
  IF condition = 'X'.
    WRITE 'test'.
  " Missing ENDIF
ENDFUNCTION.
      `;

      const result = ABAPSyntaxValidator.validate(code, 'ECC6');

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Unclosed'))).toBe(true);
    });

    it('should warn about transaction safety', () => {
      const code = `
FUNCTION Z_TEST.
  INSERT INTO ztable VALUES ls_data.
  " Missing COMMIT WORK
ENDFUNCTION.
      `;

      const result = ABAPSyntaxValidator.validate(code, 'ECC6');

      expect(result.warnings.some((w) => w.includes('COMMIT WORK'))).toBe(true);
    });

    it('should warn about naming conventions', () => {
      const code = `
FUNCTION CUSTOM_FUNCTION.
  " Should start with Z_ or Y_
  RETURN.
ENDFUNCTION.
      `;

      const result = ABAPSyntaxValidator.validate(code, 'ECC6');

      expect(
        result.warnings.some((w) => w.includes('should start with Z_ or Y_'))
      ).toBe(true);
    });

    it('should validate proper naming conventions', () => {
      const code = `
FUNCTION Z_CREATE_QUOTE.
  RETURN.
ENDFUNCTION.
      `;

      const result = ABAPSyntaxValidator.validate(code, 'ECC6');

      expect(
        result.warnings.some((w) => w.includes('should start with'))
      ).toBe(false);
    });
  });
});

describe('ODataValidator', () => {
  describe('validateEntity', () => {
    it('should pass valid entity', () => {
      const entity: ODataEntity = {
        name: 'Quote',
        properties: [
          { name: 'QuoteNumber', type: 'Edm.String', maxLength: 10 },
          { name: 'CustomerId', type: 'Edm.String', maxLength: 10 },
          { name: 'Amount', type: 'Edm.Decimal' },
        ],
        keys: ['QuoteNumber'],
      };

      const result = ODataValidator.validateEntity(entity);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should require entity name', () => {
      const entity: ODataEntity = {
        name: '',
        properties: [{ name: 'Id', type: 'Edm.String' }],
        keys: ['Id'],
      };

      const result = ODataValidator.validateEntity(entity);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('name'))).toBe(true);
    });

    it('should require at least one property', () => {
      const entity: ODataEntity = {
        name: 'Test',
        properties: [],
        keys: [],
      };

      const result = ODataValidator.validateEntity(entity);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('property'))).toBe(true);
    });

    it('should require keys to exist in properties', () => {
      const entity: ODataEntity = {
        name: 'Quote',
        properties: [{ name: 'Id', type: 'Edm.String' }],
        keys: ['NonExistent'],
      };

      const result = ODataValidator.validateEntity(entity);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('NonExistent'))
      ).toBe(true);
    });

    it('should warn about String properties without maxLength', () => {
      const entity: ODataEntity = {
        name: 'Quote',
        properties: [
          { name: 'Id', type: 'Edm.String' },
          { name: 'Name', type: 'Edm.String', maxLength: 100 },
        ],
        keys: ['Id'],
      };

      const result = ODataValidator.validateEntity(entity);

      expect(
        result.warnings.some((w) => w.includes('maxLength'))
      ).toBe(true);
    });
  });

  describe('mapAbapTypeToOData', () => {
    it('should map CHAR to Edm.String', () => {
      expect(ODataValidator.mapAbapTypeToOData('CHAR', 10)).toBe('Edm.String');
    });

    it('should map CURR to Edm.Decimal', () => {
      expect(ODataValidator.mapAbapTypeToOData('CURR', 15, 2)).toBe(
        'Edm.Decimal'
      );
    });

    it('should map DATS to Edm.DateTime', () => {
      expect(ODataValidator.mapAbapTypeToOData('DATS', 8)).toBe('Edm.DateTime');
    });

    it('should default unknown types to Edm.String', () => {
      expect(ODataValidator.mapAbapTypeToOData('UNKNOWN')).toBe('Edm.String');
    });
  });

  describe('validateMetadataXML', () => {
    it('should validate proper XML structure', () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx">
  <edmx:DataServices>
    <Schema xmlns="http://schemas.microsoft.com/ado/2008/09/edm">
      <EntityType Name="Quote">
        <Key><PropertyRef Name="Id"/></Key>
        <Property Name="Id" Type="Edm.String"/>
      </EntityType>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

      const result = ODataValidator.validateMetadataXML(xml);

      expect(result.isValid).toBe(true);
    });

    it('should detect missing XML declaration', () => {
      const xml = `<edmx:Edmx><Schema><EntityType Name="Test"/></Schema></edmx:Edmx>`;

      const result = ODataValidator.validateMetadataXML(xml);

      expect(result.errors.some((e) => e.includes('XML declaration'))).toBe(
        true
      );
    });

    it('should detect missing required elements', () => {
      const xml = `<?xml version="1.0"?><root></root>`;

      const result = ODataValidator.validateMetadataXML(xml);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
