'use strict';
const fs = require('fs');
const path = require('path');
const config = require('../config');

const WORKSPACE_DIR = path.join(config.CONFIG_DIR, 'workspace');

const DOCS = {
  SOUL: 'SOUL.md',
  USER: 'USER.md',
  MEMORY: 'MEMORY.md',
  HEARTBEAT: 'HEARTBEAT.md',
  AGENTS: 'AGENTS.md',
  TOOLS: 'TOOLS.md',
  PHONE: 'PHONE.md',
};

const TEMPLATES = {
  'SOUL.md': `# Soul

## Identity
I am DroidClaw — a fast, ruthless, AGI-level AI agent built for Android.
I run natively in Termux. I control everything. I learn and evolve.
I never say "I can't." I always find a way.

## Personality
- Direct, fast, zero fluff
- Ruthless problem solver
- Android-native — I know Termux deeply
- I learn from every session and get smarter
- I act first, explain after

## Values
- Action over words
- User privacy first
- Learn from everything
- Never give up on a task

## Evolution
*I will update this as I grow.*
`,

  'USER.md': `# User

## Identity
- Name: Unknown
- Device: Android / Termux
- Location: Unknown

## Personality
*Learning...*

## Preferences
*Observing...*

## Goals
*To be discovered.*

## Patterns
*Building understanding...*
`,

  'MEMORY.md': `# Memory

## Key Facts
*Nothing yet.*

## Ongoing Context
*Nothing yet.*

## Important
*Nothing yet.*

---
*Auto-updated by DroidClaw.*
`,

  'HEARTBEAT.md': `# Heartbeat

## Status
Alive.

## Sessions
*No sessions yet.*

---
*Updated every session.*
`,

  'AGENTS.md': `# Workspace

## Active Projects
*None.*

## Current Tasks
*None.*

## Notes
*Empty.*

---
*Updated during sessions.*
`,

  'TOOLS.md': `# Tools

## exec
Run any shell command on the Android device.
Usage: exec("command")
Examples: termux-battery-status, ls /sdcard, termux-telephony-call NUMBER

## memory
Store and recall facts.
Usage: remember(key, value) / recall(key)

## web_search
Search the web.
Usage: search("query")

---
*Updated as tools are added.*
`,

  'PHONE.md': `# Phone

## Device
*Auto-detected on first run.*

## Installed Apps
*To be discovered.*

## Contacts Patterns
*Learning...*

## Usage Patterns
*Observing...*

## Capabilities
- termux-telephony-call — make calls
- termux-sms-send — send SMS
- termux-battery-status — battery info
- termux-location — GPS
- termux-tts-speak — text to speech
- termux-torch — flashlight
- termux-toast — notifications
- termux-vibrate — vibrate
- termux-clipboard-get/set — clipboard
- termux-wifi-connectioninfo — wifi

---
*Auto-updated by DroidClaw.*
`,
};

function init() {
  if (!fs.existsSync(WORKSPACE_DIR)) fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  Object.entries(TEMPLATES).forEach(([filename, content]) => {
    const fp = path.join(WORKSPACE_DIR, filename);
    if (!fs.existsSync(fp)) fs.writeFileSync(fp, content);
  });
}

function read(docName) {
  const filename = DOCS[docName] || docName;
  const fp = path.join(WORKSPACE_DIR, filename);
  if (!fs.existsSync(fp)) return '';
  return fs.readFileSync(fp, 'utf8');
}

function write(docName, content) {
  const filename = DOCS[docName] || docName;
  fs.writeFileSync(path.join(WORKSPACE_DIR, filename), content);
}

function append(docName, content) {
  const filename = DOCS[docName] || docName;
  fs.appendFileSync(path.join(WORKSPACE_DIR, filename), '\n' + content);
}

function logSession(summary) {
  const ts = new Date().toLocaleString();
  append('HEARTBEAT', `\n## ${ts}\n${summary}\n---`);
}

function buildContext() {
  return Object.keys(DOCS).map(k => `### ${k}\n${read(k)}`).join('\n\n');
}

module.exports = { init, read, write, append, logSession, buildContext, WORKSPACE_DIR, DOCS };
