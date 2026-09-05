import fs from 'node:fs';
import path from 'node:path';

function emptyState() {
  return { settings: {}, warnings: {}, stats: {}, premium: {}, themes: {} };
}

export class PortableDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    try {
      this.state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      this.state = emptyState();
      this.flush();
    }
    this.state.settings ??= {};
    this.state.warnings ??= {};
    this.state.stats ??= {};
    this.state.premium ??= {};
    this.state.themes ??= {};
  }

  pragma() {}
  exec() {}

  flush() {
    const temporary = `${this.filePath}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(this.state, null, 2));
    fs.renameSync(temporary, this.filePath);
  }

  setPremium(chatId, enabled = true) { this.state.premium[String(chatId)] = Boolean(enabled); this.flush(); }
  isPremium(chatId) { return Boolean(this.state.premium[String(chatId)]); }
  setTheme(chatId, theme) { this.state.themes[String(chatId)] = theme; this.flush(); }
  getTheme(chatId) { return this.state.themes[String(chatId)] || 'obsidian'; }

  prepare(sql) {
    const statement = sql.replace(/\s+/g, ' ').trim();
    return {
      run: (...params) => this.run(statement, params),
      get: (...params) => this.get(statement, params)
    };
  }

  run(sql, params) {
    if (sql.startsWith('INSERT OR IGNORE INTO settings')) {
      const chatId = String(params[0]);
      this.state.settings[chatId] ??= { chat_id: chatId, rules: 'No rules have been configured yet.', welcome: 'Welcome, {name}! Please read the group rules.', antilink: 0, antispam: 0, locked: 0 };
    } else if (sql.startsWith('INSERT OR IGNORE INTO stats')) {
      const chatId = String(params[0]);
      this.state.stats[chatId] ??= { chat_id: chatId, messages: 0, actions: 0 };
    } else if (sql.startsWith('UPDATE settings SET ')) {
      const [, assignments] = sql.match(/^UPDATE settings SET (.+) WHERE chat_id=\?$/) || [];
      const chatId = String(params.at(-1));
      const record = this.state.settings[chatId];
      if (record && assignments) {
        const field = assignments.split('=')[0].trim();
        record[field] = params[0];
      }
    } else if (sql.startsWith('UPDATE stats SET ')) {
      const chatId = String(params[0]);
      const record = this.state.stats[chatId];
      if (record) {
        if (sql.includes('actions = actions + 1')) record.actions += 1;
        if (sql.includes('messages = messages + 1')) record.messages += 1;
      }
    } else if (sql.startsWith('UPDATE warnings SET count=MAX')) {
      const [chatId, userId] = params.map(String);
      const key = `${chatId}:${userId}`;
      if (this.state.warnings[key]) this.state.warnings[key].count = Math.max(0, this.state.warnings[key].count - 1);
    }
    this.flush();
    return { changes: 1 };
  }

  get(sql, params) {
    if (sql.startsWith('SELECT * FROM settings')) return this.state.settings[String(params[0])] || undefined;
    if (sql.startsWith('SELECT * FROM stats')) return this.state.stats[String(params[0])] || undefined;
    if (sql.startsWith('SELECT count FROM warnings')) return this.state.warnings[`${params[0]}:${params[1]}`] || undefined;
    if (sql.startsWith('INSERT INTO warnings')) {
      const [chatId, userId] = params.map(String);
      const key = `${chatId}:${userId}`;
      this.state.warnings[key] ??= { chat_id: chatId, user_id: userId, count: 0 };
      this.state.warnings[key].count += 1;
      this.flush();
      return { count: this.state.warnings[key].count };
    }
    return undefined;
  }
}
