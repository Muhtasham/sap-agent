/**
 * Simple HTTP Server for SAP Endpoint Generator
 *
 * This server accepts HTTP requests and generates SAP code.
 * Can be deployed anywhere (Modal, AWS, GCP, Azure, etc.)
 */

import express from 'express';
import { generateQuoteEndpoint } from './index';
import { SAPVersion } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const app = express();
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.1' });
});

// Generate endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const {
      customer_name,
      sap_version,
      config_files,
      quote_fields,
      custom_fields,
      special_logic,
      resume_session_id,
      fork_session,
    } = req.body;

    // Validate inputs
    if (!customer_name || !sap_version || !config_files || !quote_fields) {
      return res.status(400).json({
        error: 'Missing required fields: customer_name, sap_version, config_files, quote_fields',
      });
    }

    // Create temp directory for config files
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sap-gen-'));
    const configPaths: string[] = [];

    try {
      // Write config files
      for (const [filename, content] of Object.entries(config_files)) {
        const filepath = path.join(tempDir, filename);
        fs.writeFileSync(filepath, content as string);
        configPaths.push(filepath);
      }

      console.log(`[${new Date().toISOString()}] Starting generation for ${customer_name}`);

      // Generate code
      const result = await generateQuoteEndpoint({
        customerName: customer_name,
        sapVersion: sap_version as SAPVersion,
        configFiles: configPaths,
        requirements: {
          quoteFields: quote_fields,
          customFields: custom_fields,
          specialLogic: special_logic,
        },
        resume: resume_session_id,
        forkSession: fork_session,
      });

      console.log(`[${new Date().toISOString()}] Generation complete for ${customer_name}`);

      // Get generated files
      const outputDir = path.join('./output', customer_name);
      const files: string[] = [];

      if (fs.existsSync(outputDir)) {
        const walk = (dir: string) => {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
              walk(fullPath);
            } else {
              files.push(path.relative('./output', fullPath));
            }
          }
        };
        walk(outputDir);
      }

      return res.json({
        success: true,
        session_id: result.sessionId,
        files,
        customer: customer_name,
      });
    } finally {
      // Clean up temp files
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (error: any) {
    console.error('Generation error:', error);
    return res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Download generated code
app.get('/api/download/:customer', (req, res) => {
  try {
    const { customer } = req.params;
    const outputDir = path.join('./output', customer);

    if (!fs.existsSync(outputDir)) {
      return res.status(404).json({
        error: `No generated code found for customer: ${customer}`,
      });
    }

    // Create tar.gz archive
    const archivePath = path.join(os.tmpdir(), `${customer}-code.tar.gz`);
    const { execSync } = require('child_process');

    execSync(`tar -czf "${archivePath}" -C ./output "${customer}"`, {
      encoding: 'utf8',
    });

    return res.download(archivePath, `${customer}-code.tar.gz`, (err) => {
      // Clean up
      fs.unlinkSync(archivePath);
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return res.status(500).json({
      error: error.message,
    });
  }
});

// List customers
app.get('/api/customers', (_req, res) => {
  try {
    const outputDir = './output';

    if (!fs.existsSync(outputDir)) {
      return res.json({ customers: [] });
    }

    const customers = fs
      .readdirSync(outputDir)
      .filter((name) => {
        const stat = fs.statSync(path.join(outputDir, name));
        return stat.isDirectory();
      })
      .map((name) => {
        const customerDir = path.join(outputDir, name);
        const stat = fs.statSync(customerDir);

        let fileCount = 0;
        const walk = (dir: string) => {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
              walk(fullPath);
            } else {
              fileCount++;
            }
          }
        };
        walk(customerDir);

        return {
          name,
          fileCount,
          modified: stat.mtimeMs,
        };
      });

    return res.json({ customers });
  } catch (error: any) {
    console.error('List error:', error);
    return res.status(500).json({
      error: error.message,
    });
  }
});

// Start server
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║     SAP Endpoint Generator - HTTP API Server                  ║
╚════════════════════════════════════════════════════════════════╝

Server running on: http://localhost:${port}

Endpoints:
  GET    /health                    - Health check
  POST   /api/generate              - Generate SAP endpoint
  GET    /api/download/:customer    - Download generated code
  GET    /api/customers             - List all customers

Example request:
  curl -X POST http://localhost:${port}/api/generate \\
    -H "Content-Type: application/json" \\
    -d '{"customer_name":"acme","sap_version":"ECC6",...}'

Press Ctrl+C to stop
`);
  });
}

export default app;
