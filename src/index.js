#!/usr/bin/env node
'use strict';

const config = require('./config');
const workspace = require('./workspace');
const soul = require('./core/soul');
const engine = require('./core/engine');
const heartbeat = require('./core/heartbeat');
const loop = require('./core/loop');
const tui = require('./tui');

// Load all tools (must be after registry is initialized)
require('./tools/exec');
require('./tools/memory');

async function handleCommand(input) {
  const parts = input.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case '/help':
      tui.addMessage('system', [
        'Commands:',
        '  /help              — this',
        '  /status            — system status',
        '  /memory list       — show memory',
        '  /memory set k v    — store fact',
        '  /memory get k      — recall fact',
        '  /workspace         — list living docs',
        '  /workspace <DOC>   — view doc (SOUL, USER, MEMORY, etc)',
        '  /config key VAL    — set API key',
        '  /config model VAL  — set model',
        '  /config url VAL    — set base URL',
        '  /clear             — clear conversation',
        '  /exit              — exit',
      ].join('\n'));
      break;

    case '/status': {
      const hb = heartbeat.info();
      const stats = engine.stats();
      const cfg = config.load();
      tui.addMessage('system', [
        `Heartbeat : ${hb.status} (${hb.uptime})`,
        `Model     : ${stats.model}`,
        `Provider  : ${stats.baseUrl}`,
        `Messages  : ${stats.messages}`,
        `API Key   : ${cfg.apiKey ? 'set (' + cfg.apiKey.slice(-4) + ')' : 'NOT SET'}`,
        `User      : ${cfg.name}`,
        `Device    : ${cfg.device || 'Android'}`,
      ].join('\n'));
      break;
    }

    case '/config': {
      const sub = args[0];
      if (sub === 'key' && args[1]) { config.set('apiKey', args[1]); tui.addMessage('system', '✓ API key saved'); }
      else if (sub === 'model' && args[1]) { config.set('model', args[1]); tui.addMessage('system', `✓ Model: ${args[1]}`); }
      else if (sub === 'url' && args[1]) { config.set('baseUrl', args[1]); tui.addMessage('system', `✓ URL: ${args[1]}`); }
      else tui.addMessage('system', 'Usage: /config [key|model|url] VALUE');
      break;
    }

    case '/memory': {
      const mem = require('./tools/memory');
      const sub = args[0];
      const data = mem.load();
      if (!sub || sub === 'list') {
        const keys = Object.keys(data);
        tui.addMessage('system', keys.length ? keys.map(k => `${k}: ${data[k].value}`).join('\n') : 'Memory empty');
      } else if (sub === 'get' && args[1]) {
        tui.addMessage('system', data[args[1]] ? `${args[1]}: ${data[args[1]].value}` : 'Not found');
      } else if (sub === 'set' && args[1] && args[2]) {
        mem.save({ ...data, [args[1]]: { value: args.slice(2).join(' '), at: new Date().toISOString() } });
        tui.addMessage('system', `✓ Saved: ${args[1]}`);
      }
      break;
    }

    case '/workspace': {
      const sub = args[0];
      if (!sub) {
        tui.addMessage('system', Object.keys(workspace.DOCS).map(d => `  ${d}.md`).join('\n'));
      } else {
        const content = workspace.read(sub.toUpperCase());
        tui.addMessage('system', content || 'Not found');
      }
      break;
    }

    case '/clear':
      engine.clearHistory();
      tui.addMessage('system', '✓ Conversation cleared');
      break;

    case '/exit':
      tui.addMessage('system', 'Saving session...');
      if (engine.history.length > 2) {
        await soul.updateDocs(engine, engine.getHistory());
      }
      heartbeat.stop(true);
      setTimeout(() => process.exit(0), 800);
      break;

    default:
      tui.addMessage('error', `Unknown command: ${cmd}`);
  }
}

async function main() {
  // First run setup
  if (!config.get('setupDone')) {
    const setup = require('./setup');
    await setup.run();
  }

  // Init systems
  workspace.init();
  engine.init(soul);
  heartbeat.start();

  // Boot TUI
  tui.init(async (input) => {
    if (input.startsWith('/')) {
      await handleCommand(input);
      return;
    }

    // User message
    tui.addMessage('user', input);
    tui.setThinking(true);

    try {
      await loop.run(
        input,
        (iteration) => {
          // silent — no iteration noise
        },
        (toolName, args, result) => {
          if (result !== undefined) {
            tui.addMessage('tool', `${toolName} → ${String(result).slice(0, 100)}`);
          } else {
            tui.addMessage('tool', `calling ${toolName}...`);
          }
        },
        (reply) => {
          tui.setThinking(false);
          if (reply) tui.addMessage('agent', reply);
        }
      );
    } catch (e) {
      tui.setThinking(false);
      tui.addMessage('error', e.message);
    }

    heartbeat.tick();
  });
}

main();
