#!/usr/bin/env node

/**
 * MORIS Interactive Installer
 * Choose your deployment type
 */

const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

async function main() {
  console.log(`
🤖 MORIS Autonomous - Interactive Installer
═══════════════════════════════════════════

Choose how you want to deploy MORIS:

1️⃣  STANDALONE (Recommended for production)
    • Full control over infrastructure
    • Can sell as SaaS or on-premise
    • Independent of OpenClaw
    • Best for: Entrepreneurs, businesses

2️⃣  OPENCLAW EXTENSION (For personal use)
    • Uses OpenClaw infrastructure
    • Less code to maintain
    • Integrated with your OpenClaw
    • Best for: Personal productivity

3️⃣  HYBRID (Advanced)
    • Standalone core + OpenClaw adapter
    • Run both simultaneously
    • Maximum flexibility
    • Best for: Power users, developers

`);

  const choice = await question('Select option (1/2/3): ');
  
  switch(choice.trim()) {
    case '1':
      await installStandalone();
      break;
    case '2':
      await installOpenClawExtension();
      break;
    case '3':
      await installHybrid();
      break;
    default:
      console.log('❌ Invalid choice. Defaulting to Standalone.');
      await installStandalone();
  }
  
  rl.close();
}

async function installStandalone() {
  console.log('\n📦 Installing STANDALONE MORIS...\n');
  
  // Copy standalone config
  await fs.copyFile(
    'config/standalone.json',
    'moris.config.json'
  );
  
  console.log('✅ Configuration: standalone');
  console.log('✅ Docker Compose: enabled');
  console.log('✅ Full infrastructure: included');
  
  console.log(`
🚀 NEXT STEPS:
   1. cp .env.example .env
   2. Edit .env with your settings
   3. docker-compose up -d
   4. Open http://localhost

📚 Documentation: INSTALL.md
💰 You can sell this as SaaS!
`);
}

async function installOpenClawExtension() {
  console.log('\n🔌 Installing OPENCLAW EXTENSION...\n');
  
  // Copy OpenClaw config
  await fs.copyFile(
    'config/openclaw.json',
    'moris.config.json'
  );
  
  console.log('✅ Configuration: openclaw extension');
  console.log('✅ Uses OpenClaw gateway: yes');
  console.log('✅ Uses OpenClaw channels: yes');
  console.log('⚠️  Standalone server: disabled');
  
  console.log(`
🚀 NEXT STEPS:
   1. Copy 'extensions/moris' to your OpenClaw extensions folder
   2. Add to your OpenClaw config.yaml:
      
      extensions:
        moris:
          enabled: true
          path: ./extensions/moris
   
   3. Restart OpenClaw

📚 Documentation: OPENCLAW-EXTENSION.md
⚠️  For personal use only (not for resale)
`);
}

async function installHybrid() {
  console.log('\n🔀 Installing HYBRID mode...\n');
  
  // Copy hybrid config
  await fs.copyFile(
    'config/hybrid.json',
    'moris.config.json'
  );
  
  console.log('✅ Configuration: hybrid');
  console.log('✅ Standalone server: enabled');
  console.log('✅ OpenClaw adapter: enabled');
  console.log('✅ Shared core: yes');
  
  console.log(`
🚀 NEXT STEPS:
   1. cp .env.example .env
   2. docker-compose up -d (starts standalone)
   3. Copy 'extensions/moris' to OpenClaw
   4. Configure both to point to same Redis
   
💡 You can use:
   • Standalone: http://localhost (full features)
   • Via OpenClaw: Telegram/Signal integration

📚 Documentation: HYBRID.md
`);
}

main().catch(console.error);
