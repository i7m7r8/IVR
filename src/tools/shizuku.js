'use strict';
/**
 * Shizuku Layer — God-level Android automation via ADB over Shizuku
 * 
 * Shizuku gives ADB-level access without USB or root.
 * This layer runs shell commands through Shizuku's `rish` shell,
 * giving Kira powers far beyond Accessibility Service:
 * 
 *   - Install/uninstall APKs silently
 *   - Grant/revoke permissions
 *   - Kill/force-stop any app
 *   - Read/write system settings
 *   - Capture screen via screencap
 *   - Simulate input events (tap, swipe, key)
 *   - Get running processes
 *   - Set airplane mode, WiFi, mobile data
 *   - Read call logs, contacts (no permission popup)
 *   - Dump any app's UI hierarchy
 * 
 * Requirements:
 *   - Shizuku app installed + running (shizuku.rikka.app)
 *   - rish installed: adb shell sh /sdcard/Android/data/moe.shizuku.privileged.api/start.sh
 *   - OR: pkg install tsu (if rooted)
 */

const { execSync, execFileSync } = require('child_process');
const registry = require('./registry');
const fs = require('fs');
const os = require('os');

const SHIZUKU_SOCKET = '/dev/shizuku_binder';
const RISH = 'rish';

// ── Core executor ─────────────────────────────────────────────────────────────

function shizuku(cmd, timeout = 10000) {
  try {
    // Try rish first (Shizuku shell)
    const result = execSync(`${RISH} -c "${cmd.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      timeout,
    });
    return result.trim();
  } catch (e) {
    // Fallback: try direct adb shell via Termux (if USB debugging enabled)
    try {
      const result = execSync(`adb shell ${cmd}`, { encoding: 'utf8', timeout });
      return result.trim();
    } catch {
      throw new Error(`shizuku not available: ${e.message.slice(0, 100)}`);
    }
  }
}

function isShizukuRunning() {
  try {
    shizuku('echo ok', 3000);
    return true;
  } catch { return false; }
}

// ── STATUS ────────────────────────────────────────────────────────────────────

registry.register('shizuku_status', () => {
  const running = isShizukuRunning();
  if (running) return 'shizuku: running — god mode active';
  return 'shizuku: not running — install Shizuku app and tap "Start via Wireless ADB" or run: adb shell sh /sdcard/Android/data/moe.shizuku.privileged.api/start.sh';
}, 'check if Shizuku is running and available');

// ── SCREEN & INPUT ────────────────────────────────────────────────────────────

registry.register('sh_tap', ({ x, y }) => {
  shizuku(`input tap ${parseInt(x)} ${parseInt(y)}`);
  return `tapped (${x}, ${y})`;
}, 'tap screen at x,y via Shizuku — more reliable than KiraService');

registry.register('sh_swipe', ({ x1, y1, x2, y2, duration }) => {
  const d = duration || 300;
  shizuku(`input swipe ${parseInt(x1)} ${parseInt(y1)} ${parseInt(x2)} ${parseInt(y2)} ${d}`);
  return `swiped (${x1},${y1}) → (${x2},${y2})`;
}, 'swipe screen via Shizuku');

registry.register('sh_type', ({ text }) => {
  // Escape special chars for input text
  const safe = text.replace(/ /g, '%s').replace(/['"]/g, '');
  shizuku(`input text "${safe}"`);
  return `typed: ${text}`;
}, 'type text via Shizuku input');

registry.register('sh_key', ({ key }) => {
  // Common keycodes: BACK=4, HOME=3, RECENTS=187, POWER=26, ENTER=66, DEL=67
  const keycodes = {
    back: 4, home: 3, recents: 187, power: 26, enter: 66,
    delete: 67, up: 19, down: 20, left: 21, right: 22,
    volume_up: 24, volume_down: 25, mute: 164, camera: 27,
    screenshot: 120, menu: 82
  };
  const code = keycodes[key.toLowerCase()] || parseInt(key);
  shizuku(`input keyevent ${code}`);
  return `pressed key: ${key} (${code})`;
}, 'press any key via Shizuku — back, home, recents, power, enter, volume_up, volume_down, screenshot etc');

registry.register('sh_screenshot', () => {
  const path = `/sdcard/kira_shot_${Date.now()}.png`;
  shizuku(`screencap -p ${path}`);
  return `screenshot saved to ${path}`;
}, 'take screenshot and save to /sdcard');

registry.register('sh_dump_ui', ({ package: pkg }) => {
  const path = `/sdcard/kira_ui_${Date.now()}.xml`;
  shizuku(`uiautomator dump ${path}`);
  // Read and parse for text nodes
  try {
    const xml = execSync(`cat ${path}`, { encoding: 'utf8', timeout: 5000 });
    const matches = [...xml.matchAll(/text="([^"]+)"/g)].map(m => m[1]).filter(Boolean);
    shizuku(`rm ${path}`);
    return matches.slice(0, 50).join('\n') || 'no text found on screen';
  } catch {
    return `ui dump saved to ${path}`;
  }
}, 'dump full UI hierarchy — gets all text on screen including hidden elements');

// ── APP MANAGEMENT ────────────────────────────────────────────────────────────

registry.register('sh_open_app', ({ package: pkg }) => {
  // Use monkey for reliable app launch via Shizuku
  try {
    shizuku(`monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`);
    return `opened ${pkg}`;
  } catch {
    // fallback: am start
    shizuku(`am start -n $(cmd package resolve-activity --brief -c android.intent.category.LAUNCHER ${pkg} | tail -1)`);
    return `opened ${pkg}`;
  }
}, 'open any app by package name via Shizuku — more reliable than KiraService');

registry.register('sh_force_stop', ({ package: pkg }) => {
  shizuku(`am force-stop ${pkg}`);
  return `force stopped ${pkg}`;
}, 'force stop any app');

registry.register('sh_install_apk', ({ path }) => {
  const result = shizuku(`pm install -r "${path}"`, 30000);
  return result || 'install complete';
}, 'silently install APK from a file path');

registry.register('sh_uninstall', ({ package: pkg }) => {
  const result = shizuku(`pm uninstall ${pkg}`);
  return result || `uninstalled ${pkg}`;
}, 'silently uninstall any app');

registry.register('sh_grant_permission', ({ package: pkg, permission }) => {
  const result = shizuku(`pm grant ${pkg} ${permission}`);
  return result || `granted ${permission} to ${pkg}`;
}, 'grant any permission to any app without popup — e.g. android.permission.READ_CONTACTS');

registry.register('sh_revoke_permission', ({ package: pkg, permission }) => {
  const result = shizuku(`pm revoke ${pkg} ${permission}`);
  return result || `revoked ${permission} from ${pkg}`;
}, 'revoke any permission from any app');

registry.register('sh_list_apps', ({ system }) => {
  const flag = system === 'true' ? '' : '-3';
  const result = shizuku(`pm list packages ${flag}`);
  return result || 'no packages found';
}, 'list installed apps — system=true for system apps too');

registry.register('sh_app_info', ({ package: pkg }) => {
  const result = shizuku(`dumpsys package ${pkg} | grep -E "versionName|versionCode|firstInstall|lastUpdate|userId|enabled"`);
  return result || `no info for ${pkg}`;
}, 'get detailed info about any installed app');

// ── SYSTEM SETTINGS ───────────────────────────────────────────────────────────

registry.register('sh_get_setting', ({ namespace, key }) => {
  // namespace: system, secure, global
  const result = shizuku(`settings get ${namespace || 'system'} ${key}`);
  return `${key} = ${result}`;
}, 'read any system setting — namespace: system/secure/global');

registry.register('sh_set_setting', ({ namespace, key, value }) => {
  shizuku(`settings put ${namespace || 'system'} ${key} ${value}`);
  return `set ${namespace || 'system'}/${key} = ${value}`;
}, 'write any system setting — e.g. screen_brightness, airplane_mode_on');

registry.register('sh_wifi', ({ on }) => {
  const state = (on === true || on === 'true') ? 'enable' : 'disable';
  shizuku(`svc wifi ${state}`);
  return `wifi ${state}d`;
}, 'turn wifi on or off');

registry.register('sh_mobile_data', ({ on }) => {
  const state = (on === true || on === 'true') ? 'enable' : 'disable';
  shizuku(`svc data ${state}`);
  return `mobile data ${state}d`;
}, 'turn mobile data on or off');

registry.register('sh_airplane_mode', ({ on }) => {
  const val = (on === true || on === 'true') ? '1' : '0';
  shizuku(`settings put global airplane_mode_on ${val}`);
  shizuku(`am broadcast -a android.intent.action.AIRPLANE_MODE --ez state ${val === '1' ? 'true' : 'false'}`);
  return `airplane mode ${val === '1' ? 'on' : 'off'}`;
}, 'toggle airplane mode');

registry.register('sh_brightness', ({ level }) => {
  const l = Math.min(255, Math.max(0, Math.round((parseInt(level) / 100) * 255)));
  shizuku(`settings put system screen_brightness ${l}`);
  return `brightness set to ${level}% (${l}/255)`;
}, 'set screen brightness 0-100');

registry.register('sh_stay_awake', ({ on }) => {
  const val = (on === true || on === 'true') ? '7' : '0';
  shizuku(`settings put global stay_on_while_plugged_in ${val}`);
  return `stay awake while charging: ${val !== '0' ? 'on' : 'off'}`;
}, 'keep screen on while charging');

// ── PROCESSES ─────────────────────────────────────────────────────────────────

registry.register('sh_running_apps', () => {
  const result = shizuku(`dumpsys activity activities | grep "* TaskRecord" | head -20`);
  return result || shizuku(`dumpsys activity recents | grep "Recent #" | head -10`);
}, 'list currently running apps and tasks');

registry.register('sh_kill_process', ({ name }) => {
  const result = shizuku(`pkill -f ${name}`);
  return result || `killed processes matching: ${name}`;
}, 'kill any process by name');

registry.register('sh_memory_info', () => {
  const result = shizuku(`dumpsys meminfo | head -30`);
  return result || 'memory info unavailable';
}, 'get device memory usage info');

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

registry.register('sh_clear_notifications', () => {
  shizuku(`service call notification 1`);
  return 'notifications cleared';
}, 'clear all notifications');

registry.register('sh_send_notification', ({ title, text }) => {
  shizuku(`am broadcast -a android.intent.action.SEND --es title "${title}" --es text "${text}"`);
  return `notification sent: ${title}`;
}, 'send a system notification');

// ── DISPLAY ───────────────────────────────────────────────────────────────────

registry.register('sh_screen_on', () => {
  shizuku(`input keyevent 224`); // KEYCODE_WAKEUP
  return 'screen on';
}, 'wake up screen');

registry.register('sh_screen_off', () => {
  shizuku(`input keyevent 223`); // KEYCODE_SLEEP
  return 'screen off';
}, 'turn screen off');

registry.register('sh_screen_size', () => {
  const result = shizuku(`wm size`);
  return result || 'could not get screen size';
}, 'get screen resolution');

registry.register('sh_screen_density', () => {
  const result = shizuku(`wm density`);
  return result || 'could not get density';
}, 'get screen density');

// ── ADVANCED ──────────────────────────────────────────────────────────────────

registry.register('sh_run', ({ cmd: command }) => {
  if (!command) return 'error: cmd required';
  const result = shizuku(command, 15000);
  return result || '(no output)';
}, 'run any ADB shell command via Shizuku — full god-level access');

registry.register('sh_broadcast', ({ action, extras }) => {
  let cmd = `am broadcast -a ${action}`;
  if (extras) cmd += ` ${extras}`;
  const result = shizuku(cmd);
  return result || `broadcast sent: ${action}`;
}, 'send any Android broadcast intent');

registry.register('sh_start_activity', ({ component, action, extras }) => {
  let cmd = 'am start';
  if (action) cmd += ` -a ${action}`;
  if (component) cmd += ` -n ${component}`;
  if (extras) cmd += ` ${extras}`;
  const result = shizuku(cmd);
  return result || 'activity started';
}, 'start any Android activity or intent');

registry.register('sh_start_service', ({ component }) => {
  const result = shizuku(`am startservice -n ${component}`);
  return result || `service started: ${component}`;
}, 'start any Android service');

registry.register('sh_device_info', () => {
  const props = [
    'ro.product.model',
    'ro.product.brand', 
    'ro.build.version.release',
    'ro.build.version.sdk',
    'ro.product.cpu.abi',
  ];
  const results = props.map(p => {
    try { return `${p}: ${shizuku(`getprop ${p}`)}`; }
    catch { return `${p}: unknown`; }
  });
  return results.join('\n');
}, 'get detailed device info via Shizuku');

module.exports = { isShizukuRunning, shizuku };
