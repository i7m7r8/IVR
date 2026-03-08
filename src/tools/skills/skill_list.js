'use strict';
const loader   = require('./loader');
const registry = require('../registry');

module.exports = {
  name: 'skill_list',
  description: 'list all installed skills — builtin and user-installed',

  async execute() {
    const { builtin, user } = loader.listSkills();
    const lines = [];

    if (builtin.length) {
      lines.push('built-in skills:');
      for (const s of builtin) lines.push(`  • ${s}`);
    }

    if (user.length) {
      lines.push('your skills:');
      for (const s of user) lines.push(`  • ${s.name}`);
    }

    if (!builtin.length && !user.length) return 'no skills loaded yet.';

    lines.push(`\ntotal registered tools: ${registry.list().length}`);
    return lines.join('\n');
  }
};
