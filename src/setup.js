'use strict';
const readline = require('readline');
const chalk = require('chalk');
const config = require('./config');

const SETUP_ART = `
${chalk.cyan('  ██████╗ ██████╗  ██████╗ ██╗██████╗  ██████╗██╗      █████╗ ██╗    ██╗')}
${chalk.cyan('  ██╔══██╗██╔══██╗██╔═══██╗██║██╔══██╗██╔════╝██║     ██╔══██╗██║    ██║')}
${chalk.cyan('  ██║  ██║██████╔╝██║   ██║██║██║  ██║██║     ██║     ███████║██║ █╗ ██║')}
${chalk.cyan('  ██║  ██║██╔══██╗██║   ██║██║██║  ██║██║     ██║     ██╔══██║██║███╗██║')}
${chalk.cyan('  ██████╔╝██║  ██║╚██████╔╝██║██████╔╝╚██████╗███████╗██║  ██║╚███╔███╔╝')}
${chalk.cyan('  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝╚═════╝  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝')}
`;

function ask(rl, question, def) {
  return new Promise(resolve => {
    const q = def ? `${question} ${chalk.gray(`[${def}]`)}: ` : `${question}: `;
    rl.question(q, answer => resolve(answer.trim() || def || ''));
  });
}

async function run() {
  console.clear();
  console.log(SETUP_ART);
  console.log(chalk.cyan('  Welcome to DroidClaw Setup\n'));
  console.log(chalk.gray('  AGI-level AI agent for Android\n'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────────────\n'));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // Detect device info
  const { execSync } = require('child_process');
  let device = 'Android';
  try { device = execSync('getprop ro.product.model', { encoding: 'utf8' }).trim(); } catch {}

  console.log(chalk.green(`  ✓ Device detected: ${device}`));

  // Check termux-api
  let hasTermuxApi = false;
  try { execSync('termux-battery-status', { timeout: 3000 }); hasTermuxApi = true; } catch {}
  console.log(hasTermuxApi
    ? chalk.green('  ✓ Termux:API available — full phone control enabled')
    : chalk.yellow('  ⚠ Termux:API not found — install Termux:API app for phone control')
  );
  console.log();

  // Ask user details
  const name = await ask(rl, chalk.white('  What\'s your name?'), 'User');
  console.log();

  // Provider setup
  console.log(chalk.cyan('  API Setup'));
  console.log(chalk.gray('  Choose your provider:\n'));
  console.log(chalk.gray('  1) OpenAI          — https://api.openai.com/v1'));
  console.log(chalk.gray('  2) Groq            — https://api.groq.com/openai/v1'));
  console.log(chalk.gray('  3) Together AI     — https://api.together.xyz/v1'));
  console.log(chalk.gray('  4) Mistral         — https://api.mistral.ai/v1'));
  console.log(chalk.gray('  5) Ollama (local)  — http://localhost:11434/v1'));
  console.log(chalk.gray('  6) NVIDIA NIM      — https://integrate.api.nvidia.com/v1'));
  console.log(chalk.gray('  7) Custom URL\n'));

  const PROVIDERS = {
    '1': { url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    '2': { url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
    '3': { url: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3-70b-chat-hf' },
    '4': { url: 'https://api.mistral.ai/v1', model: 'mistral-small-latest' },
    '5': { url: 'http://localhost:11434/v1', model: 'llama3' },
    '6': { url: 'https://integrate.api.nvidia.com/v1', model: 'moonshotai/kimi-k2-instruct' },
    '7': { url: '', model: '' },
  };

  const choice = await ask(rl, chalk.white('  Pick provider'), '1');
  const preset = PROVIDERS[choice] || PROVIDERS['1'];

  const apiKey = await ask(rl, chalk.white('  API Key'), choice === '5' ? 'ollama' : '');
  const baseUrl = await ask(rl, chalk.white('  Base URL'), preset.url);
  const model = await ask(rl, chalk.white('  Model'), preset.model);
  console.log();

  // Save config
  config.save({ name, apiKey, baseUrl, model, setupDone: true, device, hasTermuxApi });

  // Init workspace
  require('./workspace').init();

  // Update USER.md with name and device
  const workspace = require('./workspace');
  const userDoc = workspace.read('USER').replace('Unknown', name).replace('Android / Termux', `${device} / Termux`);
  workspace.write('USER', userDoc);

  rl.close();

  console.log(chalk.green('  ✓ Setup complete!\n'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────────────\n'));
  await new Promise(r => setTimeout(r, 1000));
}

module.exports = { run };
