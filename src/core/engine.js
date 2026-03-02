'use strict';
const config = require('../config');

class Engine {
  constructor() {
    this.history = [];
    this.soul = null;
  }

  init(soul) { this.soul = soul; }

  async chat(userMessage) {
    const cfg = config.load();
    if (!cfg.apiKey) throw new Error('No API key. Run: /config key YOUR_KEY');
    const systemPrompt = this.soul ? this.soul.buildSystemPrompt() : 'You are DroidClaw.';
    this.history.push({ role: 'user', content: userMessage });
    const reply = await this._request(systemPrompt, this.history, cfg);
    this.history.push({ role: 'assistant', content: reply });
    return reply;
  }

  async rawChat(prompt) {
    const cfg = config.load();
    if (!cfg.apiKey) return null;
    return await this._request(null, [{ role: 'user', content: prompt }], cfg);
  }

  _isAnthropic(cfg) {
    return cfg.baseUrl && cfg.baseUrl.includes('anthropic.com');
  }

  async _request(systemPrompt, messages, cfg) {
    if (this._isAnthropic(cfg)) {
      return await this._anthropicRequest(systemPrompt, messages, cfg);
    }
    return await this._openaiRequest(systemPrompt, messages, cfg);
  }

  async _openaiRequest(systemPrompt, messages, cfg) {
    const msgs = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ model: cfg.model, messages: msgs, max_tokens: 4096 }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async _anthropicRequest(systemPrompt, messages, cfg) {
    const body = {
      model: cfg.model || 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: messages,
    };
    if (systemPrompt) body.system = systemPrompt;

    const res = await fetch(`${cfg.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  clearHistory() { this.history = []; }

  getHistory() {
    return this.history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => `${m.role === 'user' ? 'User' : 'DroidClaw'}: ${m.content}`)
      .join('\n');
  }

  stats() {
    const cfg = config.load();
    return { messages: this.history.length, model: cfg.model, baseUrl: cfg.baseUrl };
  }
}

module.exports = new Engine();
