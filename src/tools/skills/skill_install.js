'use strict';
const loader = require('./loader');

// This tool lets Kira write and install a new skill at runtime.
// Usage: <tool:skill_install>{"name": "weather", "description": "get weather", "code": "full js code"}</tool>

module.exports = {
  name: 'skill_install',
  description: 'write and install a new skill. args: name (string), description (string), code (full JS module string)',

  async execute({ name, description, code }) {
    if (!name || !code) return 'error: need name and code';

    // if code is just the execute body, wrap it
    const isFullModule = code.includes('module.exports');
    const finalCode = isFullModule ? code : `'use strict';
module.exports = {
  name: '${name}',
  description: '${description || name}',
  async execute(args) {
${code}
  }
};`;

    const result = loader.installSkill(name, finalCode);
    if (!result.ok) return `failed to install skill: ${result.error}`;
    return `skill '${name}' installed and ready. use <tool:${name}> now.`;
  }
};
