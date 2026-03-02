'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.droidclaw');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULTS = {
  name: 'User',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  setupDone: false,
};

function ensure() {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function load() {
  ensure();
  if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULTS };
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) }; }
  catch { return { ...DEFAULTS }; }
}

function save(data) {
  ensure();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

function get(key) { return load()[key]; }

function set(key, value) {
  const c = load();
  c[key] = value;
  save(c);
}

module.exports = { load, save, get, set, CONFIG_DIR, CONFIG_FILE };
