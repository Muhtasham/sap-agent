/**
 * MCP Tool: Generate OData metadata XML
 */

import { z } from 'zod';
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { ODataValidator } from '../../validators/odata-validator';

const generateODataArgs = {
  entity_name: z.string(),
  properties: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      nullable: z.boolean().optional(),
      maxLength: z.number().optional(),
    })
  ),
  keys: z.array(z.string()),
};

const generateODataSchema = z.object(generateODataArgs);

type GenerateMetadataInput = z.infer<typeof generateODataSchema>;

export const generateODataMetadata = tool(
  'generate_odata_metadata',
  'Generate OData service metadata XML from entity definitions',
  generateODataArgs,
  async (args: GenerateMetadataInput) => {
    try {
      const metadata = generateMetadataXML(
        args.entity_name,
        args.properties,
        args.keys
      );

      // Validate the generated metadata
      const validation = ODataValidator.validateMetadataXML(metadata);

      return {
        content: [
          {
            type: 'text' as const,
            text: metadata,
          },
          {
            type: 'text' as const,
            text: `\n\n<!-- Validation Result -->\n${JSON.stringify(validation, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Failed to generate OData metadata',
              message: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  }
);

/**
 * Generate OData metadata XML
 */
function generateMetadataXML(
  entityName: string,
  properties: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    maxLength?: number;
  }>,
  keys: string[]
): string {
  const namespace = 'SAP';
  const entityType = `${entityName}Type`;

  let xml = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx"
           xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"
           xmlns:sap="http://www.sap.com/Protocols/SAPData">
  <edmx:DataServices m:DataServiceVersion="2.0">
    <Schema Namespace="${namespace}" xmlns="http://schemas.microsoft.com/ado/2008/09/edm">

      <EntityType Name="${entityType}">
        <Key>
`;

  // Add keys
  for (const key of keys) {
    xml += `          <PropertyRef Name="${key}"/>\n`;
  }

  xml += `        </Key>\n`;

  // Add properties
  for (const prop of properties) {
    const nullable = prop.nullable !== false ? 'true' : 'false';
    const maxLength = prop.maxLength ? ` MaxLength="${prop.maxLength}"` : '';
    xml += `        <Property Name="${prop.name}" Type="${prop.type}" Nullable="${nullable}"${maxLength}/>\n`;
  }

  xml += `      </EntityType>

      <EntityContainer Name="${namespace}_Entities" m:IsDefaultEntityContainer="true">
        <EntitySet Name="${entityName}Set" EntityType="${namespace}.${entityType}"/>
      </EntityContainer>

    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

  return xml;
}
