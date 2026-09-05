import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/telegram/bot.js', 'utf8');
const readme = fs.readFileSync('README.md', 'utf8');

test('bot source contains the complete 25-command registry', () => {
  const expected = ['start','help','settings','id','rules','setrules','welcome','setwelcome','mute','unmute','ban','unban','kick','warn','unwarn','warnings','purge','pin','unpin','lock','unlock','antispam','antilink','report','stats'];
  for (const command of expected) assert.match(source, new RegExp(`['/]${command}['/]`));
  assert.equal(expected.length, 25);
});

test('README documents all 25 command entries', () => {
  const rows = readme.match(/^\|\s*(?:[1-9]|1\d|2[0-5])\s*\|/gm) || [];
  assert.equal(rows.length, 25);
});

test('brand banner is included', () => {
  assert.ok(fs.existsSync('public/assets/saintbypass-banner.png'));
  assert.match(readme, /saintbypass-banner\.png/);
});
