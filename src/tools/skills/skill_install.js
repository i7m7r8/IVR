'use strict';
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const USER_SKILLS_DIR = path.join(os.homedir(), '.droidclaw', 'skills');

if (!fs.existsSync(USER_SKILLS_DIR)) {
  fs.mkdirSync(USER_SKILLS_DIR, { recursive: true });
}

module.exports = {
  name: 'skill_install',
  description: 'write and install a new skill at runtime. args: name (string), description (string), code (full JS module.exports code)',

  async execute({ name, description, code }) {
    if (!name || !code) return 'error: need name and code';

    const isFullModule = code.includes('module.exports');
    const finalCode = isFullModule ? code : `'use strict';
module.exports = {
  name: '${name}',
  description: '${description || name}',
  async execute(args) {
${code}
  }
};`;

    const finalPath = path.join(USER_SKILLS_DIR, `${name}.js`);
    const tmpPath   = finalPath + '.tmp';

    try {
      fs.writeFileSync(tmpPath, finalCode, 'utf8');

      delete require.cache[tmpPath];
      const skill = require(tmpPath);

      if (!skill.name || typeof skill.execute !== 'function') {
        fs.unlinkSync(tmpPath);
        return 'error: skill must export { name, description, execute }';
      }

      fs.renameSync(tmpPath, finalPath);

      delete require.cache[finalPath];
      const loaded = require(finalPath);

      const registry = require('../registry');
      registry.register(loaded.name, loaded.execute, loaded.description || '');

      return `skill '${loaded.name}' installed and ready. use <tool:${loaded.name}>{}</tool> now.`;
    } catch (e) {
      try { fs.unlinkSync(tmpPath); } catch {}
      return `failed: ${e.message}`;
    }
  }
};
