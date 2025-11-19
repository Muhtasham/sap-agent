/**
 * Modal Production Deployment for SAP Endpoint Generator
 *
 * This file provides proper Modal Sandbox integration for secure, isolated
 * SAP code generation. Each generation runs in its own sandboxed container.
 *
 * Benefits:
 * - Isolated execution per customer
 * - Security: untrusted code runs in sandboxes
 * - Resource limits and timeouts
 * - Auto-scaling based on demand
 * - Persistent storage via Volumes
 *
 * Based on Modal Sandboxes documentation:
 * https://modal.com/docs/guide/sandbox
 */

import { ModalClient } from 'modal';
import { GenerateEndpointRequest, SAPVersion } from './types';
import * as fs from 'fs';
import * as path from 'path';

export interface ModalGenerationOptions {
  timeout?: number; // Sandbox timeout in milliseconds (default: 30 minutes)
  idleTimeout?: number; // Auto-terminate after inactivity (default: 5 minutes)
  verbose?: boolean; // Enable verbose logging
  volumeName?: string; // Custom volume name for output
}

/**
 * Generate SAP endpoint using Modal Sandbox for isolation
 */
export async function generateWithModalSandbox(
  request: GenerateEndpointRequest,
  options: ModalGenerationOptions = {}
): Promise<{
  success: boolean;
  sessionId?: string;
  files?: string[];
  sandboxId?: string;
  error?: string;
}> {
  const {
    timeout = 30 * 60 * 1000, // 30 minutes default
    idleTimeout = 5 * 60 * 1000, // 5 minutes idle timeout
    verbose = false,
    volumeName = 'sap-generated-code',
  } = options;

  console.log(`[Modal] Starting SAP generation for ${request.customerName}`);

  try {
    // 1. Initialize Modal client
    const modal = new ModalClient();

    // 2. Get or create the Modal app
    const app = await modal.apps.fromName('sap-endpoint-generator', {
      createIfMissing: true,
    });
    if (verbose) {
      console.log(`[Modal] Connected to app: ${app.appId}`);
    }

    // 3. Define container image with Node.js and required dependencies
    const image = modal.images
      .fromRegistry('node:20-slim')
      .dockerfileCommands([
        // Install git (required for npm install from git repos)
        'RUN apt-get update && apt-get install -y git',
        // Install build tools
        'RUN apt-get install -y build-essential python3',
        // Clean up
        'RUN rm -rf /var/lib/apt/lists/*',
      ]);

    // 4. Create or get volume for persistent output storage
    const volume = await modal.volumes.fromName(volumeName, {
      createIfMissing: true,
    });
    if (verbose) {
      console.log(`[Modal] Volume ready: ${volumeName}`);
    }

    // 4b. Get API key secret (secure way - not via env vars)
    // Note: Secret must be created first with: modal secret create anthropic-api-key ANTHROPIC_API_KEY=sk-ant-...
    const secret = await modal.secrets.fromName('anthropic-api-key');
    if (verbose) {
      console.log(`[Modal] Loaded secret: anthropic-api-key`);
    }

    // 5. Create sandbox with configuration
    const sb = await modal.sandboxes.create(app, image, {
      name: `sap-gen-${request.customerName}`, // Named sandbox - ensures one per customer
      volumes: { '/output': volume },
      timeoutMs: timeout,
      idleTimeoutMs: idleTimeout,
      workdir: '/workspace',
      secrets: [secret], // Secure API key injection
      env: {
        NODE_ENV: 'production',
      },
      verbose,
    });

    console.log(`[Modal] Sandbox created: ${sb.sandboxId}`);
    console.log(`[Modal] Name: sap-gen-${request.customerName}`);
    console.log(`[Modal] Timeout: ${timeout / 1000}s, Idle timeout: ${idleTimeout / 1000}s`);

    // 5b. Tag sandbox for organization and filtering
    await sb.setTags({
      customer: request.customerName,
      sap_version: request.sapVersion,
      environment: 'production',
      timestamp: new Date().toISOString(),
    });
    if (verbose) {
      console.log(`[Modal] Tags set: customer=${request.customerName}, sap_version=${request.sapVersion}`);
    }

    try {
      // 6. Copy project files to sandbox
      console.log('[Modal] Setting up project...');

      // In production, you would:
      // Option A: Clone from git repo
      // const gitClone = await sb.exec([
      //   'git', 'clone', 'https://github.com/your-org/sap-agent.git',
      //   '/workspace/sap-agent'
      // ]);
      // await gitClone.wait();

      // Option B: Copy files directly (for this example)
      // Note: Modal Sandboxes support file uploads via the API

      // 7. Install dependencies
      console.log('[Modal] Installing dependencies...');
      const npmInstall = await sb.exec(['npm', 'install'], {
        timeoutMs: 5 * 60 * 1000, // 5 minutes for npm install
      });

      // Stream npm install output
      if (verbose) {
        for await (const line of npmInstall.stdout) {
          process.stdout.write(`  [npm] ${line}`);
        }
      }

      const installExitCode = await npmInstall.wait();
      if (installExitCode !== 0) {
        throw new Error(`npm install failed with exit code ${installExitCode}`);
      }
      console.log('[Modal] ✓ Dependencies installed');

      // 8. Build the project
      console.log('[Modal] Building project...');
      const npmBuild = await sb.exec(['npm', 'run', 'build'], {
        timeoutMs: 2 * 60 * 1000, // 2 minutes for build
      });

      const buildExitCode = await npmBuild.wait();
      if (buildExitCode !== 0) {
        throw new Error(`npm build failed with exit code ${buildExitCode}`);
      }
      console.log('[Modal] ✓ Build complete');

      // 9. Write config files to sandbox using stdin (safer than heredoc)
      console.log('[Modal] Writing configuration files...');

      // Create config directory in sandbox
      const mkdir = await sb.exec(['mkdir', '-p', '/workspace/config']);
      await mkdir.wait();

      const configPaths: string[] = [];

      // Upload files using base64 encoding (avoids special character issues)
      for (const filePath of request.configFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const basename = path.basename(filePath);
        const targetPath = `/workspace/config/${basename}`;
        configPaths.push(targetPath);

        // Base64 encode for binary safety
        const b64Content = Buffer.from(content).toString('base64');

        // Write file using base64 decode
        const writeFile = await sb.exec([
          'bash',
          '-c',
          `echo '${b64Content}' | base64 -d > '${targetPath}'`,
        ]);
        const exitCode = await writeFile.wait();

        if (exitCode !== 0) {
          throw new Error(`Failed to write ${basename} to sandbox`);
        }
      }

      console.log(`[Modal] ✓ Wrote ${request.configFiles.length} config files`);

      // 10. Run SAP generation
      console.log('[Modal] Generating SAP code...');

      const customFieldsJson = request.requirements.customFields
        ? JSON.stringify(request.requirements.customFields)
        : '{}';

      const cliArgs = [
        'node',
        'dist/cli.js',
        'quote',
        '--customer',
        request.customerName,
        '--sap-version',
        request.sapVersion,
        '--config-files',
        ...configPaths,
        '--fields',
        ...request.requirements.quoteFields,
        '--custom-fields',
        customFieldsJson,
      ];

      if (request.requirements.specialLogic) {
        cliArgs.push('--special-logic', request.requirements.specialLogic);
      }

      if (request.resume) {
        cliArgs.push('--resume', request.resume);
      }

      if (request.forkSession) {
        cliArgs.push('--fork');
      }

      // Add output directory pointing to mounted volume
      cliArgs.push('--output', '/output');

      const generation = await sb.exec(cliArgs, {
        timeoutMs: timeout, // Use sandbox timeout
      });

      // Stream generation output
      console.log('[Modal] Generation output:');
      for await (const line of generation.stdout) {
        console.log(`  ${line.trimEnd()}`);
      }

      const exitCode = await generation.wait();
      if (exitCode !== 0) {
        const stderr = await generation.stderr.readText();
        throw new Error(`Generation failed with exit code ${exitCode}: ${stderr}`);
      }

      console.log('[Modal] ✓ Generation complete');

      // 11. List generated files
      const ls = await sb.exec(['find', `/output/${request.customerName}`, '-type', 'f']);
      const filesOutput = await ls.stdout.readText();
      const files = filesOutput
        .trim()
        .split('\n')
        .filter((f) => f)
        .map((f) => f.replace('/output/', ''));

      console.log(`[Modal] ✓ Generated ${files.length} files`);

      // 12. Volume persists! Files are saved even after sandbox termination
      console.log('[Modal] Files saved to persistent volume:', volumeName);

      return {
        success: true,
        files,
        sandboxId: sb.sandboxId,
        // Note: We don't have session ID from CLI output in this approach
        // Would need to parse stdout or modify CLI to output JSON
      };
    } finally {
      // 13. Terminate sandbox
      console.log('[Modal] Terminating sandbox...');
      await sb.terminate();
      console.log('[Modal] ✓ Sandbox terminated (volume data persists)');
    }
  } catch (error: any) {
    console.error('[Modal] Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Download generated code from Modal Volume
 */
export async function downloadFromVolume(
  customerName: string,
  volumeName: string = 'sap-generated-code'
): Promise<{ success: boolean; files?: Map<string, string>; error?: string }> {
  try {
    const modal = new ModalClient();

    const app = await modal.apps.fromName('sap-endpoint-generator', {
      createIfMissing: true,
    });

    const volume = await modal.volumes.fromName(volumeName);
    const image = modal.images.fromRegistry('node:20-slim');

    // Create a temporary sandbox just to read files
    const sb = await modal.sandboxes.create(app, image, {
      volumes: { '/output': volume },
      timeoutMs: 5 * 60 * 1000, // 5 minutes
    });

    try {
      // List all files
      const ls = await sb.exec(['find', `/output/${customerName}`, '-type', 'f']);
      const filesOutput = await ls.stdout.readText();
      const filePaths = filesOutput
        .trim()
        .split('\n')
        .filter((f) => f);

      // Read each file
      const files = new Map<string, string>();
      for (const filePath of filePaths) {
        const cat = await sb.exec(['cat', filePath]);
        const content = await cat.stdout.readText();
        const relativePath = filePath.replace(`/output/${customerName}/`, '');
        files.set(relativePath, content);
      }

      return {
        success: true,
        files,
      };
    } finally {
      await sb.terminate();
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * List all customers with generated code in volume
 */
export async function listCustomers(
  volumeName: string = 'sap-generated-code'
): Promise<{ success: boolean; customers?: string[]; error?: string }> {
  try {
    const modal = new ModalClient();

    const app = await modal.apps.fromName('sap-endpoint-generator', {
      createIfMissing: true,
    });

    const volume = await modal.volumes.fromName(volumeName);
    const image = modal.images.fromRegistry('node:20-slim');

    const sb = await modal.sandboxes.create(app, image, {
      volumes: { '/output': volume },
      timeoutMs: 60 * 1000, // 1 minute
    });

    try {
      const ls = await sb.exec(['ls', '-1', '/output']);
      const output = await ls.stdout.readText();
      const customers = output
        .trim()
        .split('\n')
        .filter((c) => c);

      return {
        success: true,
        customers,
      };
    } finally {
      await sb.terminate();
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// CLI entry point for Modal deployment
if (require.main === module) {
  const customerName = process.argv[2] || 'test-customer';
  const sapVersion = (process.argv[3] as SAPVersion) || 'ECC6';

  console.log('🚀 SAP Endpoint Generator - Modal Deployment\n');

  generateWithModalSandbox(
    {
      customerName,
      sapVersion,
      configFiles: ['./examples/test-config.txt'], // Replace with actual config
      requirements: {
        quoteFields: ['customer_id', 'quote_date', 'total_amount'],
        customFields: {
          ZZPRIORITY: 'Priority level',
        },
        specialLogic: 'Test generation in Modal sandbox',
      },
    },
    {
      verbose: true,
    }
  )
    .then((result) => {
      if (result.success) {
        console.log('\n✅ Generation successful!');
        console.log(`   Sandbox ID: ${result.sandboxId}`);
        console.log(`   Files: ${result.files?.length || 0}`);
      } else {
        console.error('\n❌ Generation failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}
