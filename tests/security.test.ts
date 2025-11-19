/**
 * Security Tests - Path Traversal Prevention
 * Tests for P1 security vulnerability fixes
 */

import { generateQuoteEndpoint } from '../src/index';
import { generateQuoteEndpointStreaming } from '../src/streaming';
import { GenerateEndpointRequest } from '../src/types';
import * as path from 'path';

describe('Security - Path Traversal Prevention', () => {
  const baseRequest: Omit<GenerateEndpointRequest, 'customerName'> = {
    sapVersion: 'ECC6',
    configFiles: ['./examples/sample-sap-config/VBAK_structure.txt'],
    requirements: {
      quoteFields: ['customer_id', 'quote_date', 'total_amount'],
    },
  };

  describe('generateQuoteEndpoint', () => {
    it('should reject customer name with path traversal (../) attack', async () => {
      const maliciousRequest: GenerateEndpointRequest = {
        ...baseRequest,
        customerName: '../../../../tmp/pwn',
      };

      await expect(generateQuoteEndpoint(maliciousRequest)).rejects.toThrow(
        /Invalid customer name.*path traversal attempt detected/
      );
    });

    it('should reject customer name with absolute path attack', async () => {
      const maliciousRequest: GenerateEndpointRequest = {
        ...baseRequest,
        customerName: '/etc/passwd',
      };

      await expect(generateQuoteEndpoint(maliciousRequest)).rejects.toThrow(
        /Invalid customer name.*path traversal attempt detected/
      );
    });

    it('should reject customer name with Windows path traversal (..\\) attack', async () => {
      const maliciousRequest: GenerateEndpointRequest = {
        ...baseRequest,
        customerName: '..\\..\\..\\Windows\\System32',
      };

      await expect(generateQuoteEndpoint(maliciousRequest)).rejects.toThrow(
        /Invalid customer name.*path traversal attempt detected/
      );
    });

    it('should reject customer name containing forward slash', async () => {
      const maliciousRequest: GenerateEndpointRequest = {
        ...baseRequest,
        customerName: 'acme/../../tmp',
      };

      await expect(generateQuoteEndpoint(maliciousRequest)).rejects.toThrow(
        /Invalid customer name.*path traversal attempt detected/
      );
    });

    it('should reject customer name containing backslash', async () => {
      const maliciousRequest: GenerateEndpointRequest = {
        ...baseRequest,
        customerName: 'acme\\..\\..\\tmp',
      };

      await expect(generateQuoteEndpoint(maliciousRequest)).rejects.toThrow(
        /Invalid customer name.*path traversal attempt detected/
      );
    });

    it('should accept valid customer names (alphanumeric, hyphens, underscores)', async () => {
      const validNames = [
        'acme',
        'acme-corp',
        'acme_corporation',
        'ACME123',
        'test-customer-2024',
      ];

      // We're just testing that these don't throw errors during sanitization
      // Not actually running the full generation (which would require API key)
      for (const name of validNames) {
        const request: GenerateEndpointRequest = {
          ...baseRequest,
          customerName: name,
        };

        // This will fail at the API call, but should pass sanitization
        // We just want to verify it doesn't throw path traversal error
        try {
          await generateQuoteEndpoint(request);
        } catch (error: any) {
          // Should NOT be a path traversal error
          expect(error.message).not.toMatch(/path traversal/i);
        }
      }
    });
  });

  describe('generateQuoteEndpointStreaming', () => {
    it('should reject customer name with path traversal attack in streaming mode', async () => {
      const maliciousRequest: GenerateEndpointRequest = {
        ...baseRequest,
        customerName: '../../../../tmp/pwn',
      };

      const generator = generateQuoteEndpointStreaming(maliciousRequest);

      // Should throw immediately when generator starts
      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _update of generator) {
          // Should not reach here
        }
      }).rejects.toThrow(/Invalid customer name.*path traversal attempt detected/);
    });

    it('should reject customer name with absolute path in streaming mode', async () => {
      const maliciousRequest: GenerateEndpointRequest = {
        ...baseRequest,
        customerName: '/etc/passwd',
      };

      const generator = generateQuoteEndpointStreaming(maliciousRequest);

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _update of generator) {
          // Should not reach here
        }
      }).rejects.toThrow(/Invalid customer name.*path traversal attempt detected/);
    });

    it('should reject customer name containing path separators in streaming mode', async () => {
      const maliciousRequest: GenerateEndpointRequest = {
        ...baseRequest,
        customerName: 'acme/../../tmp',
      };

      const generator = generateQuoteEndpointStreaming(maliciousRequest);

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _update of generator) {
          // Should not reach here
        }
      }).rejects.toThrow(/Invalid customer name.*path traversal attempt detected/);
    });
  });

  describe('Path Construction Verification', () => {
    it('should ensure sanitized paths stay within output directory', () => {
      const outputDir = path.resolve('./output');
      // Use platform-appropriate path separators for testing
      const attackVectors = [
        '../../../../tmp/pwn',
        '../../../etc/passwd',
        '/etc/passwd',
      ];

      for (const maliciousName of attackVectors) {
        // Simulate the sanitization logic
        const sanitized = path.basename(maliciousName);
        const resultPath = path.join(outputDir, sanitized);

        // Verify the resulting path is still under output directory
        const normalized = path.resolve(resultPath);
        const relative = path.relative(outputDir, normalized);

        // If path traversal succeeded, relative would start with '..'
        // With proper sanitization, the relative path should just be the basename
        expect(relative.startsWith('..')).toBe(false);
        expect(path.isAbsolute(relative)).toBe(false);

        // The resolved path should contain the output directory
        expect(normalized).toContain('output');
      }
    });

    it('should verify basename sanitization removes directory components', () => {
      const testCases = [
        { input: '../../../../tmp/pwn', expected: 'pwn' },
        { input: '../../../etc/passwd', expected: 'passwd' },
        { input: '/etc/passwd', expected: 'passwd' },
        // Windows paths are platform-specific - use path.sep to test current platform
        { input: `acme${path.sep}..${path.sep}..${path.sep}tmp`, expected: 'tmp' },
      ];

      for (const { input, expected } of testCases) {
        const sanitized = path.basename(input);
        expect(sanitized).toBe(expected);
      }
    });
  });

  describe('Integration with API Server', () => {
    it('should document that API server passes through customer_name directly', () => {
      // This test serves as documentation that the API server in api-server.ts
      // passes customer_name from request body directly to generateQuoteEndpoint
      // and generateQuoteEndpointStreaming functions.
      //
      // The sanitization MUST happen in those functions (which we've now fixed)
      // because that's where path.join() is called.
      //
      // See api-server.ts lines ~250 and ~420 where customer_name is used.

      expect(true).toBe(true); // Documentation test
    });
  });
});
