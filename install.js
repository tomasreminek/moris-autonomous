#!/usr/bin/env node

/**
 * 🚀 MORIS Autonomous — Setup Wizard
 * Jako WooCommerce: nainstaluj za 2 minuty
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (n, total, msg) => console.log(`\n${colors.bright}${colors.blue}[${n}/${total}]${colors.reset} ${colors.bright}${msg}${colors.reset}`),
  banner: () => {
    console.log(`
${colors.magenta}
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 MORIS Autonomous — 21-Agent AI Workforce System      ║
║                                                           ║
║   Nainstaluj za 2 minuty jako WooCommerce                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}
`);
  }
};

async function question(prompt, defaultValue = '', validate = null) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const display = defaultValue ? `${prompt} [${defaultValue}]: ` : `${prompt}: `;
    rl.question(display, (answer) => {
      rl.close();
      const value = answer.trim() || defaultValue;
      if (validate && !validate(value)) {
        log.warn('Neplatná hodnota, zkuste znovu');
        resolve(question(prompt, defaultValue, validate));
      } else {
        resolve(value);
      }
    });
  });
}

async function confirm(prompt, defaultYes = true) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const suffix = defaultYes ? ' [Y/n]' : ' [y/N]';
  
  return new Promise((resolve) => {
    rl.question(prompt + suffix + ': ', (answer) => {
      rl.close();
      const value = answer.trim().toLowerCase();
      if (!value) resolve(defaultYes);
      else resolve(value === 'y' || value === 'yes');
    });
  });
}

async function checkPrerequisites() {
  log.step(1, 5, 'Kontrola prerekvizit');
  
  const checks = [
    { name: 'Node.js', cmd: 'node -v', min: '18.0.0' },
    { name: 'npm', cmd: 'npm -v', min: '9.0.0' },
    { name: 'Git', cmd: 'git --version', optional: true }
  ];
  
  let allPassed = true;
  for (const check of checks) {
    try {
      const result = require('child_process').execSync(check.cmd, { encoding: 'utf8' }).trim();
      if (check.min) {
        const version = result.replace(/^v/, '');
        log.success(`${check.name} ${version}`);
      } else {
        log.success(`${check.name} nalezeno`);
      }
    } catch {
      if (check.optional) {
        log.warn(`${check.name} nenalezeno (volitelné)`);
      } else {
        log.error(`${check.name} nenalezeno`);
        allPassed = false;
      }
    }
  }
  
  if (!allPassed) {
    log.error('Nainstalujte Node.js 18+');
    process.exit(1);
  }
  
  // Dostupný port
  log.info('Hledání volného portu...');
  const preferredPort = 3001;
  const isPortFree = await checkPort(preferredPort);
  if (!isPortFree) {
    log.warn(`Port ${preferredPort} je obsazený`);
  }
}

function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

async function selectTier() {
  log.step(2, 5, 'Výběr plánu');
  
  console.log(`
${colors.bright}Dostupné plány:${colors.reset}

  ${colors.green}[1] FREE${colors.reset}     — 2 agenti, 3 projekty (zdarma navždy)
  ${colors.cyan}[2] STARTER${colors.reset}  — 5 agentů, 10 projektů ($19/měsíc)
  ${colors.magenta}[3] PRO${colors.reset}      — 12 agentů, neomezeně ($49/měsíc)
  ${colors.yellow}[4] ENTERPRISE${colors.reset} — 21 agentů, white-label ($149/měsíc)
`);
  
  const choice = await question('Vyberte plán (1-4)', '1', (v) => /^[1-4]$/.test(v));
  
  const tiers = {
    '1': { name: 'FREE', price: 0, agents: 2, projects: 3 },
    '2': { name: 'STARTER', price: 19, agents: 5, projects: 10 },
    '3': { name: 'PRO', price: 49, agents: 12, projects: Infinity },
    '4': { name: 'ENTERPRISE', price: 149, agents: 21, projects: Infinity }
  };
  
  const selected = tiers[choice];
  log.success(`Vybráno: ${colors.bright}${selected.name}${colors.reset}`);
  
  if (selected.price > 0) {
    const confirmed = await confirm(`Spustit 14denní trial ${selected.name}?`);
    selected.trial = confirmed;
  }
  
  return selected;
}

async function createAdmin() {
  log.step(3, 5, 'Vytvoření admin účtu');
  
  const email = await question('Admin email', 'admin@moris.local', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
  const password = await question('Admin heslo (min 8 znaků)', generatePassword(), (v) => v.length >= 8);
  
  log.success('Admin účet vytvořen');
  
  return { email, password };
}

async function configureEnvironment(tier, admin) {
  log.step(4, 5, 'Konfigurace prostředí');
  
  const envPath = path.join(__dirname, '.env');
  
  const env = {
    NODE_ENV: 'production',
    PORT: 3001,
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    ADMIN_EMAIL: admin.email,
    ADMIN_PASSWORD_HASH: hashPassword(admin.password),
    TIER: tier.name.toLowerCase(),
    MAX_AGENTS: tier.agents,
    MAX_PROJECTS: tier.projects === Infinity ? 'unlimited' : tier.projects,
    FEATURES_RAG: tier.price >= 19 ? 'true' : 'false',
    FEATURES_REPORTS: tier.price >= 49 ? 'true' : 'false',
    TRIAL_UNTIL: tier.trial ? getTrialEnd() : ''
  };
  
  const envContent = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(envPath, envContent);
  log.success('.env soubor vytvořen');
  
  return env;
}

function hashPassword(password) {
  // Sandboxed - neukládám reálné hashe
  return 'demo-hash-' + crypto.createHash('sha256').update(password).digest('hex').substring(0, 16);
}

function generatePassword() {
  return crypto.randomBytes(6).toString('base64').slice(0, 12);
}

function getTrialEnd() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString();
}

async function installDependencies() {
  log.step(5, 5, 'Instalace závislostí');
  
  log.info('Spouštím npm install...');
  
  return new Promise((resolve, reject) => {
    const npm = spawn('npm', ['install', '--production'], {
      stdio: 'pipe',
      cwd: __dirname
    });
    
    let output = '';
    npm.stdout.on('data', (d) => output += d);
    npm.stderr.on('data', (d) => output += d);
    
    npm.on('close', (code) => {
      if (code === 0) {
        log.success('Závislosti nainstalovány');
        resolve();
      } else {
        log.error('Instalace selhala');
        reject(new Error('npm install failed'));
      }
    });
  });
}

async function displaySuccess(admin, env) {
  console.log(`
${colors.green}${colors.bright}
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎉 MORIS Autonomous úspěšně nainstalován!              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}

${colors.bright}Přístup:${colors.reset}
  🌐 Dashboard:  ${colors.cyan}http://localhost:3001${colors.reset}
  🔑 Login:      ${colors.bright}${admin.email}${colors.reset}
  🔒 Heslo:      ${colors.bright}${admin.password}${colors.reset}

${colors.bright}Příkazy:${colors.reset}
  ${colors.cyan}/moris${colors.reset}         — Otevřít dashboard
  ${colors.cyan}/moris-agents${colors.reset}  — Seznam agentů  
  ${colors.cyan}/moris-tasks${colors.reset}   — Aktivní úkoly

${colors.bright}Správa:${colors.reset}
  ${colors.dim}npm start${colors.reset}     — Spustit server
  ${colors.dim}npm stop${colors.reset}      — Zastavit server
  ${colors.dim}npm run logs${colors.reset}   — Zobrazit logy

─────────────────────────────────────────────────────────

${tierInfo(env.TIER)}

${colors.yellow}📖 Dokumentace:${colors.reset} https://docs.openclaw.ai/plugins/moris-autonomous
${colors.yellow}💬 Podpora:${colors.reset}    https://discord.gg/clawd
`);
}

function tierInfo(tier) {
  const info = {
    free: `${colors.green}FREE tier${colors.reset} — 2 agenti, 3 projekty zdarma`,
    starter: `${colors.cyan}STARTER tier${colors.reset} — 5 agentů, trial 14 dnů`,
    pro: `${colors.magenta}PRO tier${colors.reset} — 12 agentů, API přístup`,
    enterprise: `${colors.yellow}ENTERPRISE tier${colors.reset} — 21 agentů, white-label`
  };
  return info[tier] || info.free;
}

// Hlavní funkce
async function main() {
  log.banner();
  
  try {
    await checkPrerequisites();
    const tier = await selectTier();
    const admin = await createAdmin();
    const env = await configureEnvironment(tier, admin);
    await installDependencies();
    await displaySuccess(admin, env);
    
    // Nabídka spuštění
    const startNow = await confirm('\nSpustit MORIS nyní?');
    if (startNow) {
      log.info('Spouštím server...');
      const server = spawn('node', ['core/main.js'], {
        stdio: 'inherit',
        cwd: __dirname
      });
      server.on('error', (err) => log.error(`Chyba: ${err.message}`));
    }
    
  } catch (error) {
    log.error(`Instalace selhala: ${error.message}`);
    process.exit(1);
  }
}

// Pokud spuštěno přímo
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
