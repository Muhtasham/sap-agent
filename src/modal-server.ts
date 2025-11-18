/**
 * Simple HTTP Server for SAP Endpoint Generator
 *
 * This server accepts HTTP requests and generates SAP code.
 * Can be deployed anywhere (Modal, AWS, GCP, Azure, etc.)
 */

import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { generateQuoteEndpoint } from './index';
import { generateQuoteEndpointStreaming } from './streaming';
import { SAPVersion } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const app = express();
app.use(express.json({ limit: '50mb' }));

// Swagger/OpenAPI configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SAP Endpoint Generator API',
      version: '1.0.1',
      description: 'AI-powered SAP ABAP code generator for OData endpoints using Claude Agent SDK',
      contact: {
        name: 'API Support',
        url: 'https://github.com/your-org/sap-agent',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://your-domain.com',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Generation',
        description: 'SAP code generation endpoints',
      },
      {
        name: 'Management',
        description: 'Customer and file management',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
    ],
  },
  apis: ['./src/modal-server.ts'], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'SAP Generator API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// Serve OpenAPI spec as JSON
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 version:
 *                   type: string
 *                   example: 1.0.1
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.1' });
});

/**
 * @swagger
 * /api/generate/stream:
 *   post:
 *     summary: Generate SAP ABAP endpoint code with real-time progress updates
 *     description: Streams generation progress using Server-Sent Events (SSE) for real-time visibility into agent activity, tool usage, and file creation
 *     tags: [Generation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_name
 *               - sap_version
 *               - config_files
 *               - quote_fields
 *             properties:
 *               customer_name:
 *                 type: string
 *                 description: Customer identifier (lowercase alphanumeric with hyphens/underscores)
 *                 example: acme-corp
 *               sap_version:
 *                 type: string
 *                 enum: [R3, ECC6, S4HANA]
 *                 description: SAP system version
 *                 example: ECC6
 *               config_files:
 *                 type: object
 *                 description: SAP configuration files (filename -> content)
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   VBAK_structure.txt: "Table: VBAK\nField Data Type Length Description\nVBELN CHAR 10 Document Number"
 *               quote_fields:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Required fields for the quote endpoint
 *                 example: ["customer_id", "quote_date", "valid_until", "total_amount"]
 *               custom_fields:
 *                 type: object
 *                 description: Custom SAP fields (field name -> description)
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   ZZPRIORITY: "Priority level"
 *                   ZZREFERRAL: "Referral source"
 *               special_logic:
 *                 type: string
 *                 description: Special business logic requirements
 *                 example: "Apply 10% discount for VIP customers"
 *               resume_session_id:
 *                 type: string
 *                 description: Session ID to resume previous generation
 *                 example: "abc-123-xyz"
 *               fork_session:
 *                 type: boolean
 *                 description: Whether to fork the resumed session
 *                 default: false
 *     responses:
 *       200:
 *         description: Server-Sent Events stream of progress updates
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: |
 *                 data: {"type":"init","message":"Starting SAP endpoint generation for acme-corp"}
 *
 *                 data: {"type":"progress","message":"Session initialized","sessionId":"abc-123"}
 *
 *                 data: {"type":"agent","agent":"Context Analyzer","message":"Analyzing SAP configuration and requirements"}
 *
 *                 data: {"type":"tool","tool":"parse_sap_table","message":"Parsing SAP table structures","agent":"Context Analyzer"}
 *
 *                 data: {"type":"agent","agent":"Code Generator","message":"Generating production-ready ABAP code"}
 *
 *                 data: {"type":"file","file":"Z_CREATE_QUOTE_ACME.abap","message":"Creating Z_CREATE_QUOTE_ACME.abap","agent":"Code Generator"}
 *
 *                 data: {"type":"complete","message":"Successfully generated 6 files","sessionId":"abc-123","data":{"files":["acme-corp/Z_CREATE_QUOTE_ACME.abap"],"customer":"acme-corp"}}
 *
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing required fields: customer_name, sap_version, config_files, quote_fields"
 *       500:
 *         description: Generation failed
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: |
 *                 data: {"type":"error","message":"Generation failed: API key not configured","data":{"error":"API key not configured"}}
 *
 */
app.post('/api/generate/stream', async (req, res) => {
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

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

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

      console.log(`[${new Date().toISOString()}] Starting streaming generation for ${customer_name}`);

      // Stream progress updates
      for await (const progress of generateQuoteEndpointStreaming({
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
      })) {
        // Send SSE message
        res.write(`data: ${JSON.stringify(progress)}\n\n`);

        // Check if client disconnected
        if (req.destroyed) {
          console.log(`[${new Date().toISOString()}] Client disconnected, stopping generation`);
          break;
        }
      }

      console.log(`[${new Date().toISOString()}] Streaming generation complete for ${customer_name}`);

      // End the stream
      res.end();
    } finally {
      // Clean up temp files
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    return;
  } catch (error: any) {
    console.error('Streaming generation error:', error);

    // Send error event
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message,
      data: {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    })}\n\n`);

    res.end();
    return;
  }
});

/**
 * @swagger
 * /api/generate:
 *   post:
 *     summary: Generate SAP ABAP endpoint code
 *     description: Generates production-ready SAP ABAP code including function modules, OData services, tests, and deployment guides
 *     tags: [Generation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_name
 *               - sap_version
 *               - config_files
 *               - quote_fields
 *             properties:
 *               customer_name:
 *                 type: string
 *                 description: Customer identifier (lowercase alphanumeric with hyphens/underscores)
 *                 example: acme-corp
 *               sap_version:
 *                 type: string
 *                 enum: [R3, ECC6, S4HANA]
 *                 description: SAP system version
 *                 example: ECC6
 *               config_files:
 *                 type: object
 *                 description: SAP configuration files (filename -> content)
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   VBAK_structure.txt: "Table: VBAK\nField Data Type Length Description\nVBELN CHAR 10 Document Number"
 *               quote_fields:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Required fields for the quote endpoint
 *                 example: ["customer_id", "quote_date", "valid_until", "total_amount"]
 *               custom_fields:
 *                 type: object
 *                 description: Custom SAP fields (field name -> description)
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   ZZPRIORITY: "Priority level"
 *                   ZZREFERRAL: "Referral source"
 *               special_logic:
 *                 type: string
 *                 description: Special business logic requirements
 *                 example: "Apply 10% discount for VIP customers"
 *               resume_session_id:
 *                 type: string
 *                 description: Session ID to resume previous generation
 *                 example: "abc-123-xyz"
 *               fork_session:
 *                 type: boolean
 *                 description: Whether to fork the resumed session
 *                 default: false
 *     responses:
 *       200:
 *         description: Code generation successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 session_id:
 *                   type: string
 *                   example: "session-xyz-789"
 *                 files:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["acme-corp/Z_CREATE_QUOTE_ACME.abap", "acme-corp/DEPLOYMENT_GUIDE.md"]
 *                 customer:
 *                   type: string
 *                   example: "acme-corp"
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing required fields: customer_name, sap_version, config_files, quote_fields"
 *       500:
 *         description: Generation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Generation error message"
 *                 stack:
 *                   type: string
 *                   description: Stack trace (only in development mode)
 */
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

/**
 * @swagger
 * /api/download/{customer}:
 *   get:
 *     summary: Download generated code as tar.gz archive
 *     description: Downloads all generated SAP code for a specific customer as a compressed archive
 *     tags: [Management]
 *     parameters:
 *       - in: path
 *         name: customer
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer identifier
 *         example: acme-corp
 *     responses:
 *       200:
 *         description: Archive downloaded successfully
 *         content:
 *           application/gzip:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No generated code found for customer: acme-corp"
 *       500:
 *         description: Download failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
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

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: List all customers with generated code
 *     description: Returns a list of all customers who have generated SAP code, including file counts and modification timestamps
 *     tags: [Management]
 *     responses:
 *       200:
 *         description: List of customers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: Customer identifier
 *                         example: "acme-corp"
 *                       fileCount:
 *                         type: number
 *                         description: Number of generated files
 *                         example: 12
 *                       modified:
 *                         type: number
 *                         description: Last modification timestamp (milliseconds since epoch)
 *                         example: 1705406400000
 *       500:
 *         description: Failed to list customers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
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

📚 API Documentation:
  http://localhost:${port}/api-docs          - Interactive Swagger UI
  http://localhost:${port}/api-docs.json     - OpenAPI JSON spec

Endpoints:
  GET    /health                    - Health check
  POST   /api/generate              - Generate SAP endpoint (blocking)
  POST   /api/generate/stream       - Generate SAP endpoint (streaming SSE)
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
