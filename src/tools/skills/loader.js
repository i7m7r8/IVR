'use strict';
const fs       = require('fs');
const path     = require('path');
const os       = require('os');
const registry = require('../registry');

const SKILLS_DIR = path.join(__dirname);
const USER_SKILLS_DIR = path.join(os.homedir(), '.droidclaw', 'skills');

// ensure user skills dir exists
if (!fs.existsSync(USER_SKILLS_DIR)) {
  fs.mkdirSync(USER_SKILLS_DIR, { recursive: true });
}

function loadSkill(filePath) {
  try {
    const skill = require(filePath);
    if (!skill.name || !skill.execute) {
      console.error(`[skills] skipping ${filePath} — missing name or execute`);
      return false;
    }
    registry.register(skill.name, skill.execute, skill.description || '');
    return true;
  } catch (e) {
    console.error(`[skills] failed to load ${filePath}: ${e.message}`);
    return false;
  }
}

function loadAll() {
  let loaded = 0;

  // load built-in skills from this directory
  const files = fs.readdirSync(SKILLS_DIR).filter(f =>
    f.endsWith('.js') && f !== 'loader.js' && f !== 'index.js'
  );
  for (const file of files) {
    if (loadSkill(path.join(SKILLS_DIR, file))) loaded++;
  }

  // load user skills from ~/.droidclaw/skills/
  if (fs.existsSync(USER_SKILLS_DIR)) {
    const userFiles = fs.readdirSync(USER_SKILLS_DIR).filter(f => f.endsWith('.js'));
    for (const file of userFiles) {
      if (loadSkill(path.join(USER_SKILLS_DIR, file))) loaded++;
    }
  }

  return loaded;
}

function listSkills() {
  const builtin = fs.readdirSync(SKILLS_DIR)
    .filter(f => f.endsWith('.js') && f !== 'loader.js' && f !== 'index.js')
    .map(f => f.replace('.js', ''));

  const user = fs.existsSync(USER_SKILLS_DIR)
    ? fs.readdirSync(USER_SKILLS_DIR)
        .filter(f => f.endsWith('.js'))
        .map(f => ({ name: f.replace('.js', ''), type: 'user' }))
    : [];

  return { builtin, user };
}

function installSkill(name, code) {
  // validate it's a proper skill
  const tmpPath = path.join(USER_SKILLS_DIR, `_tmp_${name}.js`);
  const finalPath = path.join(USER_SKILLS_DIR, `${name}.js`);

  try {
    fs.writeFileSync(tmpPath, code);
    const skill = require(tmpPath);
    if (!skill.name || !skill.execute) {
      fs.unlinkSync(tmpPath);
      return { ok: false, error: 'skill must export { name, description, execute }' };
    }
    // move to final location
    fs.renameSync(tmpPath, finalPath);
    // register immediately
    registry.register(skill.name, skill.execute, skill.description || '');
    return { ok: true, name: skill.name };
  } catch (e) {
    try { fs.unlinkSync(tmpPath); } catch {}
    return { ok: false, error: e.message };
  }
}

function removeSkill(name) {
  const filePath = path.join(USER_SKILLS_DIR, `${name}.js`);
  if (!fs.existsSync(filePath)) return { ok: false, error: 'skill not found' };
  try {
    fs.unlinkSync(filePath);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { loadAll, listSkills, installSkill, removeSkill, loadSkill };
