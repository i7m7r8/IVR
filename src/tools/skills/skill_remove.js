'use strict';
const loader = require('./loader');

module.exports = {
  name: 'skill_remove',
  description: 'remove a user-installed skill by name',

  async execute({ name }) {
    if (!name) return 'error: need skill name';
    const result = loader.removeSkill(name);
    if (!result.ok) return `failed: ${result.error}`;
    return `skill '${name}' removed.`;
  }
};
