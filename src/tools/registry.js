'use strict';

const tools = {};

function register(name, fn) {
  tools[name] = fn;
}

async function execute(name, args) {
  if (!tools[name]) throw new Error(`Unknown tool: ${name}`);
  return await tools[name](args);
}

function list() {
  return Object.keys(tools);
}

module.exports = { register, execute, list };
