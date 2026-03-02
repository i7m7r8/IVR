'use strict';
const fs = require('fs');
const path = require('path');
const config = require('../config');
const registry = require('./registry');

const MEMORY_FILE = path.join(config.CONFIG_DIR, 'memory.json');

function load() {
  if (!fs.existsSync(MEMORY_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')); } catch { return {}; }
}

function save(data) { fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2)); }

registry.register('remember', async ({ key, value }) => {
  const data = load();
  data[key] = { value, at: new Date().toISOString() };
  save(data);
  return `Remembered: ${key} = ${value}`;
});

registry.register('recall', async ({ key }) => {
  const data = load();
  return data[key] ? data[key].value : 'Not found';
});

registry.register('memory_list', async () => {
  const data = load();
  const keys = Object.keys(data);
  if (!keys.length) return 'Memory empty';
  return keys.map(k => `${k}: ${data[k].value}`).join('\n');
});

// Export for direct use
module.exports = { load, save };
