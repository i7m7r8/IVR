'use strict';
const engine = require('./engine');
const registry = require('../tools/registry');
const heartbeat = require('./heartbeat');

const MAX_ITERATIONS = 10;

// Parse tool calls from AI response
function parseTools(text) {
  const tools = [];
  const regex = /<tool:(\w+)>([\s\S]*?)<\/tool>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      tools.push({ name: match[1], args: JSON.parse(match[2] || '{}') });
    } catch {
      tools.push({ name: match[1], args: { raw: match[2] } });
    }
  }
  return tools;
}

function cleanReply(text) {
  return text.replace(/<tool:[\s\S]*?<\/tool>/g, '').trim();
}

class AgentLoop {
  async run(userMessage, onThink, onTool, onReply) {
    let iteration = 0;

    // First call with user message
    onThink && onThink(1);
    let raw = await engine.chat(userMessage);
    let tools = parseTools(raw);
    let reply = cleanReply(raw);

    // No tools — done immediately
    if (tools.length === 0) {
      heartbeat.tick();
      onReply && onReply(reply);
      return reply;
    }

    // Tool loop
    while (tools.length > 0 && iteration < MAX_ITERATIONS) {
      iteration++;

      // Execute all tools
      let toolResults = '';
      for (const tool of tools) {
        onTool && onTool(tool.name, tool.args);
        try {
          const result = await registry.execute(tool.name, tool.args);
          const resultStr = String(result).slice(0, 2000);
          toolResults += `[${tool.name}]: ${resultStr}\n`;
          onTool && onTool(tool.name, tool.args, resultStr);
        } catch (e) {
          toolResults += `[${tool.name}] Error: ${e.message}\n`;
        }
      }

      // Get next response with tool results
      onThink && onThink(iteration + 1);
      raw = await engine.chat(`Tool results:\n${toolResults}\nNow give your final response to the user.`);
      tools = parseTools(raw);
      reply = cleanReply(raw);
    }

    heartbeat.tick();
    onReply && onReply(reply || 'Done.');
    return reply;
  }
}

module.exports = new AgentLoop();
