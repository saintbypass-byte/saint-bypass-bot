import 'dotenv/config';
import { createServer } from 'node:http';
import { PortableDatabase } from './portable-db.js';
import { Bot, GrammyError, HttpError, InputFile, InlineKeyboard } from 'grammy';

const token = process.env.BOT_TOKEN;
if (!token || token === 'replace_with_botfather_token') {
  throw new Error('BOT_TOKEN is required. Copy .env.example to .env and add your BotFather token.');
}

const OWNER_ID = Number(process.env.BOT_OWNER_ID || 0);
const PREFIX = process.env.COMMAND_PREFIX || '/';
const db = new PortableDatabase(process.env.DB_PATH || './data/saintbypass.json');
db.exec('portable persistent storage initialized');

const bot = new Bot(token);
const commands = [
  ['start', 'Show the branded welcome panel'], ['help', 'List all 25 commands'], ['settings', 'Show group settings'], ['id', 'Show a user or chat ID'], ['rules', 'Show group rules'],
  ['setrules', 'Set group rules'], ['welcome', 'Show the welcome message'], ['setwelcome', 'Set a welcome message'], ['mute', 'Mute a replied-to user'], ['unmute', 'Restore a user voice'],
  ['ban', 'Ban a replied-to user'], ['unban', 'Unban by numeric user ID'], ['kick', 'Remove a replied-to user'], ['warn', 'Warn a replied-to user'], ['unwarn', 'Remove one warning'],
  ['warnings', 'Show a user warning count'], ['purge', 'Delete replied-to messages'], ['pin', 'Pin a replied-to message'], ['unpin', 'Unpin the current message'], ['lock', 'Lock the group'],
  ['unlock', 'Unlock the group'], ['antispam', 'Toggle flood protection'], ['antilink', 'Toggle link filtering'], ['report', 'Report a replied-to message'], ['stats', 'Show activity statistics']
];
const adminCommands = new Set(['settings','setrules','setwelcome','mute','unmute','ban','unban','kick','warn','unwarn','purge','pin','unpin','lock','unlock','antispam','antilink','stats']);

function ensureChat(chatId) {
  db.prepare('INSERT OR IGNORE INTO settings(chat_id) VALUES (?)').run(String(chatId));
  db.prepare('INSERT OR IGNORE INTO stats(chat_id) VALUES (?)').run(String(chatId));
}
function settings(chatId) { ensureChat(chatId); return db.prepare('SELECT * FROM settings WHERE chat_id=?').get(String(chatId)); }
function bump(chatId, actions = false) { ensureChat(chatId); db.prepare(`UPDATE stats SET ${actions ? 'actions = actions + 1' : 'messages = messages + 1'} WHERE chat_id=?`).run(String(chatId)); }
function replyTarget(ctx) { return ctx.message?.reply_to_message?.from || null; }
function targetLabel(user) { return user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : 'that user'; }
function args(ctx) { return String(ctx.match || '').trim(); }
function commandText(name, description) { return `${PREFIX}${name} — ${description}`; }
function esc(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }

const brand = '<b>♛ SAINTBYPASS</b> <i>PRO BOT</i>';
const divider = '━━━━━━━━━━━━━━━━━━';
const menu = () => new InlineKeyboard()
  .text('⚡ Dashboard', 'menu:dashboard').text('🛡 Security', 'menu:security').row()
  .text('📖 Rules', 'menu:rules').text('🧰 Commands', 'menu:help').row()
  .text('📊 Statistics', 'menu:stats').text('❌ Close', 'menu:close');
const backMenu = () => new InlineKeyboard().text('◀ Back to dashboard', 'menu:dashboard');
const securityMenu = () => new InlineKeyboard()
  .text('🔗 Anti-link', 'toggle:antilink').text('🧠 Anti-spam', 'toggle:antispam').row()
  .text('🔒 Lock group', 'action:lock').text('🔓 Unlock', 'action:unlock').row()
  .text('◀ Back', 'menu:dashboard');

async function isAdminFor(ctx, chatId, userId = ctx.from?.id) {
  if (OWNER_ID && userId === OWNER_ID) return true;
  if (!chatId || !userId) return false;
  try {
    const member = await ctx.api.getChatMember(chatId, userId);
    return member.status === 'creator' || member.status === 'administrator';
  } catch { return false; }
}
async function isAdmin(ctx) { return isAdminFor(ctx, ctx.chat?.id); }
async function requireAdmin(ctx) {
  if (await isAdmin(ctx)) return true;
  await ctx.reply('⛔ <b>Administrator access required.</b>', { parse_mode: 'HTML' });
  return false;
}
async function requireGroup(ctx) {
  if (ctx.chat && ['group', 'supergroup'].includes(ctx.chat.type)) return true;
  await ctx.reply('This command works inside a Telegram group.');
  return false;
}
async function safeDelete(ctx, messageId = ctx.msg?.message_id) { try { if (messageId) await ctx.api.deleteMessage(ctx.chat.id, messageId); } catch {} }
async function pulse(ctx, text = 'Processing') {
  const message = await ctx.reply(`⏳ <b>${text}</b> ·`, { parse_mode: 'HTML' });
  for (const frame of ['··', '···']) {
    try { await new Promise((resolve) => setTimeout(resolve, 180)); await ctx.api.editMessageText(ctx.chat.id, message.message_id, `⏳ <b>${text}</b> ${frame}`, { parse_mode: 'HTML' }); } catch {}
  }
  return message;
}
async function finishPulse(ctx, message, text, keyboard) {
  try { await ctx.api.editMessageText(ctx.chat.id, message.message_id, text, { parse_mode: 'HTML', reply_markup: keyboard }); } catch { await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard }); }
}
function helpText() {
  return `${brand}\n${divider}\n<b>COMMAND MATRIX</b>\n\n${commands.map(([name, description], i) => `<code>${String(i + 1).padStart(2, '0')}</code>  ${commandText(name, description)}`).join('\n')}\n\n<i>Reply to a member or message when a target is required.</i>`;
}
function settingsText(chatId, title = 'GROUP DASHBOARD') {
  const s = settings(chatId);
  return `${brand}\n${divider}\n<b>${esc(title)}</b>\n\n🔗 Anti-link: <b>${s.antilink ? 'ONLINE' : 'OFFLINE'}</b>\n🧠 Anti-spam: <b>${s.antispam ? 'ONLINE' : 'OFFLINE'}</b>\n🔒 Group lock: <b>${s.locked ? 'ACTIVE' : 'OPEN'}</b>\n\n<i>Use the buttons below for instant controls.</i>`;
}

bot.command('start', async (ctx) => {
  const caption = `${brand}\n${divider}\n<i>Professional group defense, moderation, and admin intelligence.</i>\n\n<b>System status:</b> <code>ONLINE</code>\n<b>Command modules:</b> <code>25 ACTIVE</code>\n<b>Protection layer:</b> <code>READY</code>\n\nTap <b>Dashboard</b> to open the control center.`;
  await ctx.replyWithPhoto(new InputFile('public/assets/saintbypass-banner.png'), { caption, parse_mode: 'HTML', reply_markup: menu() });
});
bot.command('help', async (ctx) => ctx.reply(helpText(), { parse_mode: 'HTML', reply_markup: backMenu() }));
bot.command('settings', async (ctx) => { if (!await requireGroup(ctx)) return; await ctx.reply(settingsText(ctx.chat.id, ctx.chat.title), { parse_mode: 'HTML', reply_markup: menu() }); });
bot.command('id', async (ctx) => { const user = replyTarget(ctx); await ctx.reply(`${brand}\n${divider}\n🆔 <b>IDENTITY DATA</b>\n\nChat ID: <code>${ctx.chat.id}</code>\nUser ID: <code>${user?.id || ctx.from.id}</code>`, { parse_mode: 'HTML', reply_markup: backMenu() }); });
bot.command('rules', async (ctx) => { if (!await requireGroup(ctx)) return; await ctx.reply(`${brand}\n${divider}\n📖 <b>GROUP RULES</b>\n\n${esc(settings(ctx.chat.id).rules)}`, { parse_mode: 'HTML', reply_markup: backMenu() }); });
bot.command('setrules', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const text = args(ctx); if (!text) return ctx.reply('Usage: /setrules Your rules here'); db.prepare('UPDATE settings SET rules=? WHERE chat_id=?').run(text, String(ctx.chat.id)); bump(ctx.chat.id, true); await ctx.reply('✅ <b>Rules updated.</b>', { parse_mode: 'HTML', reply_markup: menu() }); });
bot.command('welcome', async (ctx) => { if (!await requireGroup(ctx)) return; await ctx.reply(`${brand}\n${divider}\n👋 <b>WELCOME PROTOCOL</b>\n\n${esc(settings(ctx.chat.id).welcome)}`, { parse_mode: 'HTML', reply_markup: backMenu() }); });
bot.command('setwelcome', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const text = args(ctx); if (!text) return ctx.reply('Usage: /setwelcome Welcome, {name}!'); db.prepare('UPDATE settings SET welcome=? WHERE chat_id=?').run(text, String(ctx.chat.id)); bump(ctx.chat.id, true); await ctx.reply('✅ <b>Welcome protocol updated.</b>', { parse_mode: 'HTML', reply_markup: menu() }); });

async function applyModeration(ctx, action, chatId, userId, label) {
  if (action === 'mute') await ctx.api.restrictChatMember(chatId, userId, { permissions: { can_send_messages: false } });
  if (action === 'unmute') await ctx.api.restrictChatMember(chatId, userId, { permissions: { can_send_messages: true, can_send_audios: true, can_send_documents: true, can_send_photos: true, can_send_videos: true, can_send_video_notes: true, can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true } });
  if (action === 'ban') await ctx.api.banChatMember(chatId, userId);
  if (action === 'kick') { await ctx.api.banChatMember(chatId, userId); await ctx.api.unbanChatMember(chatId, userId); }
  bump(chatId, true);
  await ctx.reply(`✅ <b>${action.toUpperCase()} COMPLETE</b>\n\nTarget: ${esc(label)}\nAudit trail: <code>RECORDED</code>`, { parse_mode: 'HTML', reply_markup: menu() });
}
async function moderate(ctx, action) {
  if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return;
  const user = replyTarget(ctx); if (!user) return ctx.reply('Reply to the member you want to moderate.');
  if (user.id === ctx.from.id) return ctx.reply('You cannot moderate yourself.');
  if (['mute', 'ban', 'kick'].includes(action)) {
    const keyboard = new InlineKeyboard().text(`✅ Confirm ${action}`, `confirm:${action}:${ctx.chat.id}:${user.id}`).text('Cancel', 'menu:close');
    return ctx.reply(`⚠️ <b>CONFIRM ACTION</b>\n\nYou are about to <b>${action.toUpperCase()}</b> <i>${esc(targetLabel(user))}</i>.`, { parse_mode: 'HTML', reply_markup: keyboard });
  }
  await applyModeration(ctx, action, ctx.chat.id, user.id, targetLabel(user));
}
for (const action of ['mute', 'unmute', 'ban', 'kick']) bot.command(action, (ctx) => moderate(ctx, action));
bot.command('unban', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const id = Number(args(ctx)); if (!id) return ctx.reply('Usage: /unban numeric_user_id'); await ctx.api.unbanChatMember(ctx.chat.id, id); bump(ctx.chat.id, true); await ctx.reply(`✅ User <code>${id}</code> can join again.`, { parse_mode: 'HTML', reply_markup: menu() }); });
bot.command('warn', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const user = replyTarget(ctx); if (!user) return ctx.reply('Reply to a member to warn them.'); const row = db.prepare('INSERT INTO warnings(chat_id,user_id,count) VALUES (?,?,1) ON CONFLICT(chat_id,user_id) DO UPDATE SET count=count+1 RETURNING count').get(String(ctx.chat.id), String(user.id)); bump(ctx.chat.id, true); await ctx.reply(`⚠️ <b>WARNING ISSUED</b>\n\n${esc(targetLabel(user))} now has <b>${row.count}</b> warning(s).`, { parse_mode: 'HTML', reply_markup: menu() }); });
bot.command('unwarn', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const user = replyTarget(ctx); if (!user) return ctx.reply('Reply to a member.'); db.prepare('UPDATE warnings SET count=MAX(0,count-1) WHERE chat_id=? AND user_id=?').run(String(ctx.chat.id), String(user.id)); bump(ctx.chat.id, true); await ctx.reply(`✅ One warning removed from ${esc(targetLabel(user))}.`, { parse_mode: 'HTML', reply_markup: menu() }); });
bot.command('warnings', async (ctx) => { if (!await requireGroup(ctx)) return; const user = replyTarget(ctx); const id = user?.id || ctx.from.id; const row = db.prepare('SELECT count FROM warnings WHERE chat_id=? AND user_id=?').get(String(ctx.chat.id), String(id)); await ctx.reply(`${brand}\n${divider}\n⚠️ <b>WARNING PROFILE</b>\n\n${esc(user ? targetLabel(user) : 'You')}: <b>${row?.count || 0}</b> warning(s).`, { parse_mode: 'HTML', reply_markup: backMenu() }); });
bot.command('purge', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const count = Math.min(Math.max(Number(args(ctx)) || 1, 1), 100); const start = ctx.msg.reply_to_message?.message_id || ctx.msg.message_id; let deleted = 0; for (let i = 0; i < count; i++) { try { await ctx.api.deleteMessage(ctx.chat.id, start - i); deleted++; } catch {} } bump(ctx.chat.id, true); await ctx.reply(`🧹 <b>PURGE COMPLETE</b>\n\nDeleted <b>${deleted}</b> message(s).`, { parse_mode: 'HTML', reply_markup: menu() }); });
bot.command('pin', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const id = ctx.msg.reply_to_message?.message_id; if (!id) return ctx.reply('Reply to the message you want to pin.'); await ctx.api.pinChatMessage(ctx.chat.id, id); bump(ctx.chat.id, true); await ctx.reply('📌 <b>Message pinned.</b>', { parse_mode: 'HTML', reply_markup: menu() }); });
bot.command('unpin', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; await ctx.api.unpinChatMessage(ctx.chat.id); bump(ctx.chat.id, true); await ctx.reply('📌 <b>Latest pin removed.</b>', { parse_mode: 'HTML', reply_markup: menu() }); });
async function toggle(ctx, field, label) { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const value = args(ctx).toLowerCase(); if (!['on', 'off'].includes(value)) return ctx.reply(`Usage: /${field} on|off`); db.prepare(`UPDATE settings SET ${field}=? WHERE chat_id=?`).run(value === 'on' ? 1 : 0, String(ctx.chat.id)); bump(ctx.chat.id, true); await ctx.reply(`✅ <b>${label} ${value.toUpperCase()}</b>`, { parse_mode: 'HTML', reply_markup: securityMenu() }); }
bot.command('antispam', (ctx) => toggle(ctx, 'antispam', 'Anti-spam'));
bot.command('antilink', (ctx) => toggle(ctx, 'antilink', 'Anti-link'));
bot.command('lock', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; await ctx.api.setChatPermissions(ctx.chat.id, { can_send_messages: false }); db.prepare('UPDATE settings SET locked=1 WHERE chat_id=?').run(String(ctx.chat.id)); bump(ctx.chat.id, true); await ctx.reply('🔒 <b>GROUP LOCKED</b>', { parse_mode: 'HTML', reply_markup: securityMenu() }); });
bot.command('unlock', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; await ctx.api.setChatPermissions(ctx.chat.id, { can_send_messages: true, can_send_audios: true, can_send_documents: true, can_send_photos: true, can_send_videos: true, can_send_video_notes: true, can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true }); db.prepare('UPDATE settings SET locked=0 WHERE chat_id=?').run(String(ctx.chat.id)); bump(ctx.chat.id, true); await ctx.reply('🔓 <b>GROUP UNLOCKED</b>', { parse_mode: 'HTML', reply_markup: securityMenu() }); });
bot.command('report', async (ctx) => { if (!await requireGroup(ctx)) return; const reported = ctx.msg.reply_to_message; if (!reported) return ctx.reply('Reply to the message you want to report.'); const admins = await ctx.api.getChatAdministrators(ctx.chat.id); const text = `⚠️ <b>REPORT IN ${esc(ctx.chat.title)}</b>\nFrom: ${esc(targetLabel(ctx.from))} (<code>${ctx.from.id}</code>)\nMessage ID: <code>${reported.message_id}</code>`; for (const admin of admins) { try { await ctx.api.sendMessage(admin.user.id, text, { parse_mode: 'HTML' }); } catch {} } await ctx.reply('✅ Report sent to group administrators.', { parse_mode: 'HTML', reply_markup: menu() }); });
bot.command('stats', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const row = db.prepare('SELECT * FROM stats WHERE chat_id=?').get(String(ctx.chat.id)); await ctx.reply(`${brand}\n${divider}\n📊 <b>ACTIVITY INTELLIGENCE</b>\n\nMessages observed: <b>${row?.messages || 0}</b>\nAdmin actions: <b>${row?.actions || 0}</b>`, { parse_mode: 'HTML', reply_markup: backMenu() }); });

bot.callbackQuery(/^menu:(dashboard|help|security|rules|stats|close)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const action = ctx.match[1];
  if (action === 'close') return ctx.deleteMessage().catch(() => {});
  if (action === 'help') return ctx.editMessageText(helpText(), { parse_mode: 'HTML', reply_markup: backMenu() });
  if (action === 'dashboard') return ctx.editMessageText(`${brand}\n${divider}\n<b>CONTROL CENTER</b>\n\n⚡ System: <code>ONLINE</code>\n🛡 Protection: <code>ARMED</code>\n🧰 Modules: <code>25 ACTIVE</code>\n\nChoose a panel below.`, { parse_mode: 'HTML', reply_markup: menu() });
  if (action === 'security') { const chatId = ctx.callbackQuery.message?.chat.id; if (!chatId || !(await isAdminFor(ctx, chatId))) return ctx.answerCallbackQuery({ text: 'Admin access required.', show_alert: true }); return ctx.editMessageText(settingsText(chatId, 'SECURITY CONTROL'), { parse_mode: 'HTML', reply_markup: securityMenu() }); }
  if (action === 'rules') { const chatId = ctx.callbackQuery.message?.chat.id; if (!chatId) return; return ctx.editMessageText(`${brand}\n${divider}\n📖 <b>GROUP RULES</b>\n\n${esc(settings(chatId).rules)}`, { parse_mode: 'HTML', reply_markup: backMenu() }); }
  if (action === 'stats') { const chatId = ctx.callbackQuery.message?.chat.id; if (!chatId || !(await isAdminFor(ctx, chatId))) return ctx.answerCallbackQuery({ text: 'Admin access required.', show_alert: true }); const row = db.prepare('SELECT * FROM stats WHERE chat_id=?').get(String(chatId)); return ctx.editMessageText(`${brand}\n${divider}\n📊 <b>ACTIVITY INTELLIGENCE</b>\n\nMessages observed: <b>${row?.messages || 0}</b>\nAdmin actions: <b>${row?.actions || 0}</b>`, { parse_mode: 'HTML', reply_markup: backMenu() }); }
});
bot.callbackQuery(/^toggle:(antilink|antispam)$/, async (ctx) => { const chatId = ctx.callbackQuery.message?.chat.id; if (!chatId || !(await isAdminFor(ctx, chatId))) return ctx.answerCallbackQuery({ text: 'Admin access required.', show_alert: true }); const field = ctx.match[1]; const current = settings(chatId)[field]; db.prepare(`UPDATE settings SET ${field}=? WHERE chat_id=?`).run(current ? 0 : 1, String(chatId)); bump(chatId, true); await ctx.answerCallbackQuery(`${field} ${current ? 'disabled' : 'enabled'}`); await ctx.editMessageText(settingsText(chatId, 'SECURITY CONTROL'), { parse_mode: 'HTML', reply_markup: securityMenu() }); });
bot.callbackQuery(/^action:(lock|unlock)$/, async (ctx) => { const chatId = ctx.callbackQuery.message?.chat.id; if (!chatId || !(await isAdminFor(ctx, chatId))) return ctx.answerCallbackQuery({ text: 'Admin access required.', show_alert: true }); const action = ctx.match[1]; if (action === 'lock') await ctx.api.setChatPermissions(chatId, { can_send_messages: false }); else await ctx.api.setChatPermissions(chatId, { can_send_messages: true, can_send_audios: true, can_send_documents: true, can_send_photos: true, can_send_videos: true, can_send_video_notes: true, can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true }); db.prepare('UPDATE settings SET locked=? WHERE chat_id=?').run(action === 'lock' ? 1 : 0, String(chatId)); bump(chatId, true); await ctx.answerCallbackQuery(`Group ${action}ed`); await ctx.editMessageText(settingsText(chatId, 'SECURITY CONTROL'), { parse_mode: 'HTML', reply_markup: securityMenu() }); });
bot.callbackQuery(/^confirm:(mute|ban|kick):(-?\d+):(\d+)$/, async (ctx) => { const chatId = Number(ctx.match[2]); const userId = Number(ctx.match[3]); if (!(await isAdminFor(ctx, chatId))) return ctx.answerCallbackQuery({ text: 'Admin access required.', show_alert: true }); await ctx.answerCallbackQuery('Action confirmed'); await ctx.editMessageText('⏳ <b>Applying moderation action…</b>', { parse_mode: 'HTML' }); await applyModeration(ctx, ctx.match[1], chatId, userId, `user ${userId}`); });

bot.on('message', async (ctx, next) => { if (ctx.chat && ['group', 'supergroup'].includes(ctx.chat.type)) { ensureChat(ctx.chat.id); bump(ctx.chat.id); const s = settings(ctx.chat.id); const text = ctx.msg.text || ctx.msg.caption || ''; if (s.antilink && /https?:\/\/|t\.me\//i.test(text) && !(await isAdmin(ctx))) { await safeDelete(ctx); return; } if (s.antispam && text.length > 5000 && !(await isAdmin(ctx))) { await safeDelete(ctx); return; } if (ctx.from && ctx.msg.new_chat_members?.length) await ctx.reply(s.welcome.replaceAll('{name}', ctx.from.first_name)); } return next(); });
bot.catch((err) => { const e = err.error; if (e instanceof GrammyError) console.error('Telegram error:', e.description); else if (e instanceof HttpError) console.error('Network error:', e); else console.error('Unhandled error:', e); });

if (process.env.PORT) { const healthServer = createServer((req, res) => { if (req.url === '/healthz') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: 'ok', service: 'saintbypass-telegram-bot' })); return; } res.writeHead(404); res.end('Not found'); }); healthServer.listen(Number(process.env.PORT), '0.0.0.0', () => console.log(`Health server listening on ${process.env.PORT}`)); }
console.log('SAINTBYPASS PRO BOT starting with 25 commands…');
await bot.api.setMyCommands(commands.map(([command, description]) => ({ command, description })));
await bot.start({ allowed_updates: ['message', 'edited_message', 'chat_member', 'callback_query'] });
