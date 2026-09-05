import 'dotenv/config';
import Database from 'better-sqlite3';
import { Bot, GrammyError, HttpError, InputFile } from 'grammy';

const token = process.env.BOT_TOKEN;
if (!token || token === 'replace_with_botfather_token') {
  throw new Error('BOT_TOKEN is required. Copy .env.example to .env and add your BotFather token.');
}

const OWNER_ID = Number(process.env.BOT_OWNER_ID || 0);
const PREFIX = process.env.COMMAND_PREFIX || '/';
const db = new Database(process.env.DB_PATH || './data/saintbypass.sqlite');
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (chat_id TEXT PRIMARY KEY, rules TEXT DEFAULT 'No rules have been configured yet.', welcome TEXT DEFAULT 'Welcome, {name}! Please read the group rules.', antilink INTEGER DEFAULT 0, antispam INTEGER DEFAULT 0, locked INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS warnings (chat_id TEXT NOT NULL, user_id TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(chat_id, user_id));
  CREATE TABLE IF NOT EXISTS stats (chat_id TEXT PRIMARY KEY, messages INTEGER NOT NULL DEFAULT 0, actions INTEGER NOT NULL DEFAULT 0);
`);

const bot = new Bot(token);
const commands = [
  ['start', 'Show the branded welcome panel'], ['help', 'List all 25 commands'], ['settings', 'Show group settings'], ['id', 'Show a user or chat ID'], ['rules', 'Show group rules'],
  ['setrules', 'Set group rules'], ['welcome', 'Show the welcome message'], ['setwelcome', 'Set the welcome message'], ['mute', 'Mute a replied-to user'], ['unmute', 'Restore a user\'s voice'],
  ['ban', 'Ban a replied-to user'], ['unban', 'Unban by numeric user ID'], ['kick', 'Remove a replied-to user'], ['warn', 'Warn a replied-to user'], ['unwarn', 'Remove one warning'],
  ['warnings', 'Show a user\'s warning count'], ['purge', 'Delete replied-to message(s)'], ['pin', 'Pin a replied-to message'], ['unpin', 'Unpin the current message'], ['lock', 'Lock the group for members'],
  ['unlock', 'Unlock the group'], ['antispam', 'Toggle flood protection'], ['antilink', 'Toggle link filtering'], ['report', 'Report a replied-to message to admins'], ['stats', 'Show group activity stats']
];
const adminCommands = new Set(['settings','setrules','setwelcome','mute','unmute','ban','unban','kick','warn','unwarn','purge','pin','unpin','lock','unlock','antispam','antilink','stats']);
const groupOnly = new Set(commands.map(([name]) => name).filter((name) => !['start','help','id'].includes(name)));

function ensureChat(chatId) {
  db.prepare('INSERT OR IGNORE INTO settings(chat_id) VALUES (?)').run(String(chatId));
  db.prepare('INSERT OR IGNORE INTO stats(chat_id) VALUES (?)').run(String(chatId));
}
function settings(chatId) { ensureChat(chatId); return db.prepare('SELECT * FROM settings WHERE chat_id=?').get(String(chatId)); }
function bump(chatId, actions = false) { ensureChat(chatId); db.prepare(`UPDATE stats SET ${actions ? 'actions = actions + 1' : 'messages = messages + 1'} WHERE chat_id=?`).run(String(chatId)); }
function replyTarget(ctx) { return ctx.message?.reply_to_message?.from || null; }
function targetId(ctx) { return replyTarget(ctx)?.id || Number(ctx.match?.trim()); }
function targetLabel(user) { return user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : 'that user'; }
function args(ctx) { return String(ctx.match || '').trim(); }
function commandText(name, description) { return `${PREFIX}${name} — ${description}`; }

async function isAdmin(ctx) {
  if (!ctx.chat || !ctx.from) return false;
  if (OWNER_ID && ctx.from.id === OWNER_ID) return true;
  if (!['group','supergroup'].includes(ctx.chat.type)) return false;
  const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
  return member.status === 'creator' || member.status === 'administrator';
}
async function requireAdmin(ctx) {
  if (await isAdmin(ctx)) return true;
  await ctx.reply('Only group administrators can use this command.');
  return false;
}
async function requireGroup(ctx) {
  if (ctx.chat && ['group','supergroup'].includes(ctx.chat.type)) return true;
  await ctx.reply('This command works inside a Telegram group.');
  return false;
}
async function safeDelete(ctx, messageId = ctx.msg?.message_id) { try { if (messageId) await ctx.api.deleteMessage(ctx.chat.id, messageId); } catch {} }

bot.command('start', async (ctx) => ctx.replyWithPhoto(new InputFile('public/assets/saintbypass-banner.png'), { caption: '♛ SAINTBYPASS PRO BOT\\n\\nProfessional group protection, moderation, and admin tools. Use /help to see all 25 commands.' }));
bot.command('help', async (ctx) => ctx.reply('<b>SAINTBYPASS PRO BOT — COMMANDS</b>\n\n' + commands.map(([n,d], i) => `${String(i + 1).padStart(2, '0')}. ${commandText(n,d)}`).join('\n') + '\n\nReply to a user or message when a command requires a target.', { parse_mode: 'HTML' }));
bot.command('settings', async (ctx) => { if (!await requireGroup(ctx)) return; const s=settings(ctx.chat.id); await ctx.reply(`<b>${ctx.chat.title}</b>\nAnti-link: ${s.antilink ? 'ON' : 'OFF'}\nAnti-spam: ${s.antispam ? 'ON' : 'OFF'}\nGroup lock: ${s.locked ? 'ON' : 'OFF'}\n\nUse /rules to view rules.`, { parse_mode: 'HTML' }); });
bot.command('id', async (ctx) => { const user = replyTarget(ctx); await ctx.reply(`Chat ID: <code>${ctx.chat.id}</code>\nUser ID: <code>${user?.id || ctx.from.id}</code>`, { parse_mode: 'HTML' }); });
bot.command('rules', async (ctx) => { if (!await requireGroup(ctx)) return; await ctx.reply(settings(ctx.chat.id).rules); });
bot.command('setrules', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const text=args(ctx); if (!text) return ctx.reply('Usage: /setrules Your rules here'); db.prepare('UPDATE settings SET rules=? WHERE chat_id=?').run(text, String(ctx.chat.id)); bump(ctx.chat.id, true); await ctx.reply('Group rules updated.'); });
bot.command('welcome', async (ctx) => { if (!await requireGroup(ctx)) return; await ctx.reply(settings(ctx.chat.id).welcome); });
bot.command('setwelcome', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const text=args(ctx); if (!text) return ctx.reply('Usage: /setwelcome Welcome, {name}!'); db.prepare('UPDATE settings SET welcome=? WHERE chat_id=?').run(text, String(ctx.chat.id)); bump(ctx.chat.id, true); await ctx.reply('Welcome message updated.'); });

async function moderate(ctx, action) {
  if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return;
  const user = replyTarget(ctx); if (!user) return ctx.reply('Reply to the member you want to moderate.');
  if (user.id === ctx.from.id) return ctx.reply('You cannot moderate yourself.');
  const chatId=ctx.chat.id;
  if (action === 'mute') await ctx.api.restrictChatMember(chatId, user.id, { permissions: { can_send_messages: false } });
  if (action === 'unmute') await ctx.api.restrictChatMember(chatId, user.id, { permissions: { can_send_messages: true, can_send_audios: true, can_send_documents: true, can_send_photos: true, can_send_videos: true, can_send_video_notes: true, can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true } });
  if (action === 'ban') await ctx.api.banChatMember(chatId, user.id);
  if (action === 'kick') { await ctx.api.banChatMember(chatId, user.id); await ctx.api.unbanChatMember(chatId, user.id); }
  bump(chatId, true); await ctx.reply(`${action.toUpperCase()} applied to ${targetLabel(user)}.`);
}
for (const action of ['mute','unmute','ban','kick']) bot.command(action, (ctx) => moderate(ctx, action));
bot.command('unban', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const id=Number(args(ctx)); if (!id) return ctx.reply('Usage: /unban numeric_user_id'); await ctx.api.unbanChatMember(ctx.chat.id,id); bump(ctx.chat.id,true); await ctx.reply(`User ${id} can join again.`); });
bot.command('warn', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const user=replyTarget(ctx); if (!user) return ctx.reply('Reply to a member to warn them.'); const row=db.prepare('INSERT INTO warnings(chat_id,user_id,count) VALUES (?,?,1) ON CONFLICT(chat_id,user_id) DO UPDATE SET count=count+1 RETURNING count').get(String(ctx.chat.id),String(user.id)); bump(ctx.chat.id,true); await ctx.reply(`${targetLabel(user)} has ${row.count} warning(s).`); });
bot.command('unwarn', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const user=replyTarget(ctx); if (!user) return ctx.reply('Reply to a member.'); db.prepare('UPDATE warnings SET count=MAX(0,count-1) WHERE chat_id=? AND user_id=?').run(String(ctx.chat.id),String(user.id)); bump(ctx.chat.id,true); await ctx.reply(`One warning removed from ${targetLabel(user)}.`); });
bot.command('warnings', async (ctx) => { if (!await requireGroup(ctx)) return; const user=replyTarget(ctx); const id=user?.id || ctx.from.id; const row=db.prepare('SELECT count FROM warnings WHERE chat_id=? AND user_id=?').get(String(ctx.chat.id),String(id)); await ctx.reply(`${user ? targetLabel(user) : 'You'} have ${row?.count || 0} warning(s).`); });
bot.command('purge', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const count=Math.min(Math.max(Number(args(ctx)) || 1,1),100); const start=ctx.msg.reply_to_message?.message_id || ctx.msg.message_id; let deleted=0; for(let i=0;i<count;i++){try{await ctx.api.deleteMessage(ctx.chat.id,start-i);deleted++;}catch{}} bump(ctx.chat.id,true); await ctx.reply(`Deleted ${deleted} message(s).`); });
bot.command('pin', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; const id=ctx.msg.reply_to_message?.message_id; if(!id)return ctx.reply('Reply to the message you want to pin.'); await ctx.api.pinChatMessage(ctx.chat.id,id); bump(ctx.chat.id,true); await ctx.reply('Message pinned.'); });
bot.command('unpin', async (ctx) => { if (!await requireGroup(ctx) || !await requireAdmin(ctx)) return; await ctx.api.unpinChatMessage(ctx.chat.id); bump(ctx.chat.id,true); await ctx.reply('Latest pinned message removed.'); });
async function toggle(ctx, field, label) { if(!await requireGroup(ctx)||!await requireAdmin(ctx))return; const value=args(ctx).toLowerCase(); if(!['on','off'].includes(value))return ctx.reply(`Usage: /${field} on|off`); db.prepare(`UPDATE settings SET ${field}=? WHERE chat_id=?`).run(value==='on'?1:0,String(ctx.chat.id)); bump(ctx.chat.id,true); await ctx.reply(`${label} ${value.toUpperCase()}.`); }
bot.command('antispam',(ctx)=>toggle(ctx,'antispam','Anti-spam'));
bot.command('antilink',(ctx)=>toggle(ctx,'antilink','Anti-link'));
bot.command('lock',async(ctx)=>{if(!await requireGroup(ctx)||!await requireAdmin(ctx))return;await ctx.api.setChatPermissions(ctx.chat.id,{can_send_messages:false});db.prepare('UPDATE settings SET locked=1 WHERE chat_id=?').run(String(ctx.chat.id));bump(ctx.chat.id,true);await ctx.reply('Group locked for members.');});
bot.command('unlock',async(ctx)=>{if(!await requireGroup(ctx)||!await requireAdmin(ctx))return;await ctx.api.setChatPermissions(ctx.chat.id,{can_send_messages:true,can_send_audios:true,can_send_documents:true,can_send_photos:true,can_send_videos:true,can_send_video_notes:true,can_send_voice_notes:true,can_send_polls:true,can_send_other_messages:true,can_add_web_page_previews:true});db.prepare('UPDATE settings SET locked=0 WHERE chat_id=?').run(String(ctx.chat.id));bump(ctx.chat.id,true);await ctx.reply('Group unlocked.');});
bot.command('report',async(ctx)=>{if(!await requireGroup(ctx))return;const reported=ctx.msg.reply_to_message;if(!reported)return ctx.reply('Reply to the message you want to report.');const admins=await ctx.api.getChatAdministrators(ctx.chat.id);const text=`⚠️ Report in ${ctx.chat.title}\nFrom: ${targetLabel(ctx.from)} (<code>${ctx.from.id}</code>)\nMessage ID: ${reported.message_id}`;for(const admin of admins){try{await ctx.api.sendMessage(admin.user.id,text,{parse_mode:'HTML'});}catch{}}await ctx.reply('Report sent to the group administrators.');});
bot.command('stats',async(ctx)=>{if(!await requireGroup(ctx)||!await requireAdmin(ctx))return;const row=db.prepare('SELECT * FROM stats WHERE chat_id=?').get(String(ctx.chat.id));await ctx.reply(`Messages observed: ${row?.messages||0}\nAdmin actions: ${row?.actions||0}`);});

bot.on('message', async (ctx, next) => {
  if (ctx.chat && ['group','supergroup'].includes(ctx.chat.type)) {
    ensureChat(ctx.chat.id); bump(ctx.chat.id);
    const s=settings(ctx.chat.id); const text=ctx.msg.text || ctx.msg.caption || '';
    if (s.antilink && /https?:\/\/|t\.me\//i.test(text) && !(await isAdmin(ctx))) { await safeDelete(ctx); return; }
    if (s.antispam && text.length > 5000 && !(await isAdmin(ctx))) { await safeDelete(ctx); return; }
    if (ctx.from && ctx.msg.new_chat_members?.length) { const name=ctx.from.first_name; await ctx.reply(s.welcome.replaceAll('{name}',name)); }
  }
  return next();
});

bot.catch((err) => { const e=err.error; if (e instanceof GrammyError) console.error('Telegram error:',e.description); else if (e instanceof HttpError) console.error('Network error:',e); else console.error('Unhandled error:',e); });
console.log('SAINTBYPASS PRO BOT starting with 25 commands…');
await bot.api.setMyCommands(commands.map(([command, description]) => ({ command, description })));
await bot.start({ allowed_updates: ['message','edited_message','chat_member'] });
