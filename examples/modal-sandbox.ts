/**
 * Modal Sandbox Example for SAP Endpoint Generator
 *
 * This example shows how to use Modal's JavaScript SDK to run
 * SAP code generation in a secure, isolated sandbox.
 *
 * Based on Modal JS SDK examples:
 * https://github.com/modal-labs/libmodal/tree/main/modal-js/examples
 */

import { ModalClient } from 'modal';

async function generateWithModal() {
  console.log('Initializing Modal client...');
  const modal = new ModalClient();

  // 1. Get or create the app
  const app = await modal.apps.fromName('sap-endpoint-generator', {
    createIfMissing: true,
  });
  console.log('✓ Connected to Modal app:', app.appId);

  // 2. Define the container image with Node.js
  const image = modal.images.fromRegistry('node:18-slim');
  console.log('✓ Image configured: node:18-slim');

  // 3. Create volume for persistent storage
  const volume = await modal.volumes.fromName('sap-generated-code', {
    createIfMissing: true,
  });
  console.log('✓ Volume ready for persistent storage');

  // 4. Create sandbox
  console.log('\nCreating sandbox...');
  const sb = await modal.sandboxes.create(app, image, {
    volumes: { '/output': volume },
    timeoutMs: 30 * 60 * 1000, // 30 minutes
    workdir: '/workspace',
  });
  console.log('✓ Sandbox created:', sb.sandboxId);
  console.log(`  Use: modal.sandboxes.fromId('${sb.sandboxId}') to reconnect\n`);

  try {
    // 5. Install git (needed for npm install)
    console.log('Installing git...');
    const aptUpdate = await sb.exec(['apt-get', 'update']);
    await aptUpdate.wait();

    const aptInstall = await sb.exec(['apt-get', 'install', '-y', 'git']);
    await aptInstall.wait();
    console.log('✓ Git installed');

    // 6. Clone the repo (or you could copy files directly)
    console.log('\nCloning repository...');
    const gitClone = await sb.exec([
      'git',
      'clone',
      'https://github.com/your-org/sap-agent.git', // Replace with your repo
      '/workspace/sap-agent',
    ]);

    // Note: In production, you'd use a real repo or copy files
    // For now, let's just show the sandbox capability
    console.log('Note: Replace with your actual git repo URL');

    // 7. Alternative: Show how to run commands in the sandbox
    console.log('\nRunning test commands in sandbox...');

    // Create a test file
    const echo = await sb.exec([
      'bash',
      '-c',
      'echo "Hello from Modal sandbox" > /output/test.txt',
    ]);
    await echo.wait();

    // Read it back
    const cat = await sb.exec(['cat', '/output/test.txt']);
    const output = await cat.stdout.readText();
    console.log('✓ File created and read:', output.trim());

    // 8. List what's in the output volume
    const ls = await sb.exec(['ls', '-la', '/output']);
    const lsOutput = await ls.stdout.readText();
    console.log('\n📁 Contents of /output volume:');
    console.log(lsOutput);

    // 9. Show how to handle long-running processes
    console.log('\n⏱️  Running a long task (5 seconds)...');
    const longTask = await sb.exec([
      'bash',
      '-c',
      'for i in {1..5}; do echo "Working... $i/5"; sleep 1; done',
    ]);

    // Stream output in real-time
    for await (const line of longTask.stdout) {
      process.stdout.write(`  ${line}`);
    }

    const exitCode = await longTask.wait();
    console.log(`✓ Task completed with exit code: ${exitCode}`);

    console.log('\n✅ All operations successful!');
    console.log('\nTo use this for SAP generation, you would:');
    console.log('1. Copy your SAP generator code to the sandbox');
    console.log('2. Run: npm install && npm run build');
    console.log('3. Execute: node dist/cli.js quote --customer acme ...');
    console.log('4. Generated code is saved to /output (persisted in Volume)');
    console.log('5. Download or process the results');
  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    // 10. Clean up
    console.log('\nTerminating sandbox...');
    await sb.terminate();
    console.log('✓ Sandbox terminated');
    console.log('\n💡 The volume persists! Files in /output are still saved.');
  }
}

// Run the example
if (require.main === module) {
  generateWithModal()
    .then(() => {
      console.log('\n🎉 Example completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example failed:', error);
      process.exit(1);
    });
}

export { generateWithModal };
