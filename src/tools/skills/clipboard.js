'use strict';
const { execSync } = require('child_process');

module.exports = {
  name: 'clipboard',
  description: 'read or write clipboard. args: action ("read" or "write"), text (for write)',

  async execute({ action = 'read', text }) {
    if (action === 'read') {
      try {
        const result = execSync('termux-clipboard-get', { encoding: 'utf8', timeout: 3000 });
        return result.trim() || '(clipboard is empty)';
      } catch {
        return 'error: could not read clipboard';
      }
    }

    if (action === 'write') {
      if (!text) return 'error: need text to write';
      try {
        execSync(`echo ${JSON.stringify(text)} | termux-clipboard-set`, { timeout: 3000 });
        return `copied to clipboard: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`;
      } catch {
        return 'error: could not write to clipboard';
      }
    }

    return 'error: action must be "read" or "write"';
  }
};
