'use strict';
const { execSync } = require('child_process');
const registry = require('./registry');

registry.register('exec', async ({ command }) => {
  if (!command) throw new Error('No command provided');
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });
    return result.trim() || '(no output)';
  } catch (e) {
    return `Error: ${e.message}`;
  }
});
