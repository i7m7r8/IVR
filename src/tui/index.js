'use strict';
const chalk = require('chalk');
const readline = require('readline');
const heartbeat = require('../core/heartbeat');
const engine = require('../core/engine');
const config = require('../config');

const ART = `
${chalk.hex('#4fc3f7')('  ██████╗ ██████╗  ██████╗ ██╗██████╗  ██████╗██╗      █████╗ ██╗    ██╗')}
${chalk.hex('#4fc3f7')('  ██╔══██╗██╔══██╗██╔═══██╗██║██╔══██╗██╔════╝██║     ██╔══██╗██║    ██║')}
${chalk.hex('#4fc3f7')('  ██║  ██║██████╔╝██║   ██║██║██║  ██║██║     ██║     ███████║██║ █╗ ██║')}
${chalk.hex('#4fc3f7')('  ██║  ██║██╔══██╗██║   ██║██║██║  ██║██║     ██║     ██╔══██║██║███╗██║')}
${chalk.hex('#4fc3f7')('  ██████╔╝██║  ██║╚██████╔╝██║██████╔╝╚██████╗███████╗██║  ██║╚███╔███╔╝')}
${chalk.hex('#4fc3f7')('  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝╚═════╝  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝')}
${chalk.hex('#546e7a')('                          fast. powerful. android-first.')}
`;

class TUI {
  constructor() {
    this.rl = null;
    this.onInput = null;
    this.thinking = false;
    this._dots = null;
  }

  init(onInput) {
    this.onInput = onInput;
    console.clear();
    console.log(ART);
    this._statusLine();
    const cfg = config.load();
    console.log(chalk.hex('#546e7a')(`\n  ready, ${cfg.name.toLowerCase()}. type anything.\n`));
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    this._prompt();
  }

  _prompt() {
    this.rl.question(chalk.hex('#546e7a')('  > '), (input) => {
      const text = input.trim();
      if (text && this.onInput) this.onInput(text);
      else this._prompt();
    });
  }

  _statusLine() {
    const hb = heartbeat.info();
    const stats = engine.stats();
    console.log(
      chalk.hex('#37474f')(`  * ${hb.status}  /  uptime: ${hb.uptime}  /  msgs: ${hb.messages}  /  ${stats.model}`)
    );
  }

  addMessage(type, text) {
    if (type === 'agent') {
      console.log(chalk.hex('#b0bec5')('\n  ' + text.split('\n').join('\n  ')));
      console.log();
      this._prompt();
    } else if (type === 'tool') {
      console.log(chalk.hex('#37474f')(`  > ${text}`));
    } else if (type === 'system') {
      console.log(chalk.hex('#546e7a')(`  ${text}`));
      if (!this.thinking) this._prompt();
    } else if (type === 'error') {
      console.log(chalk.hex('#ef5350')(`  ! ${text}`));
      this._prompt();
    }
  }

  setThinking(on) {
    this.thinking = on;
    if (on) {
      process.stdout.write(chalk.hex('#37474f')('  ..'));
      this._dots = setInterval(() => process.stdout.write(chalk.hex('#37474f')('.')), 700);
    } else {
      if (this._dots) { clearInterval(this._dots); this._dots = null; }
      process.stdout.write('\r' + ' '.repeat(20) + '\r');
    }
  }
}

module.exports = new TUI();
