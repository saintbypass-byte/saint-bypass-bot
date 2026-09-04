"use strict";

function normalizeMetadata(metadata = {}) {
  return {
    memberCount: Array.isArray(metadata.participants) ? metadata.participants.length : 0,
    groupName: metadata.subject || "Unnamed Group",
    groupDescription: metadata.desc?.toString() || "No description set.",
  };
}

function participantTag(jid = "") {
  return `@${jid.split("@")[0]}`;
}

function buildGreeting({ action, participant, metadata = {} }) {
  const { memberCount, groupName, groupDescription } = normalizeMetadata(metadata);
  const tag = participantTag(participant);

  if (action === "add") {
    return `
┏━━━🔥༺ 𓆩💀𓆪 ༻🔥━━━┓
   💠 *WELCOME TO BYPASS* 💠
┗━━━🔥༺ 𓆩💀𓆪 ༻🔥━━━┛
👹 *Hey ${tag}, Welcome to*  
『 ${groupName} 』
⚡ *Current Members:* ${memberCount}  
📜 *Group Description:*  
『 ${groupDescription} 』
💀 *Attitude ON, Rules OFF*  
👾 *SAINT BYPASS-MD welcomes you with POWER* ⚡
          `;
  }

  if (action === "remove") {
    return `
┏━━━💔༺ 𓆩☠️𓆪 ༻💔━━━┓
   ❌ *GOODBYE WARRIOR* ❌
┗━━━💔༺ 𓆩☠️𓆪 ༻💔━━━┛
💔 ${tag} *has left the battlefield...*  
⚡ *Now only ${Math.max(memberCount - 1, 0)} members remain in ${groupName}*  
☠️ *Hell doesn’t forget easily...*  
          `;
  }

  return null;
}

function createGreetingHandler({ isEnabled, getGroupMetadata, sendMessage, logger = console }) {
  if (typeof isEnabled !== "function") throw new TypeError("isEnabled must be a function");
  if (typeof getGroupMetadata !== "function") throw new TypeError("getGroupMetadata must be a function");
  if (typeof sendMessage !== "function") throw new TypeError("sendMessage must be a function");

  return async function handleParticipantUpdate(update = {}) {
    const { id, participants = [], action } = update;
    if (!id || !isEnabled(id) || !Array.isArray(participants) || participants.length === 0) {
      return { sent: 0, skipped: true };
    }

    if (action !== "add" && action !== "remove") {
      return { sent: 0, skipped: true };
    }

    try {
      const metadata = await getGroupMetadata(id);
      let sent = 0;
      for (const participant of participants) {
        const text = buildGreeting({ action, participant, metadata });
        if (!text) continue;
        await sendMessage(id, { text, mentions: [participant] });
        sent += 1;
      }
      return { sent, skipped: false };
    } catch (error) {
      logger.error?.("Greeting handling failed", error);
      return { sent: 0, skipped: false, error };
    }
  };
}

module.exports = {
  normalizeMetadata,
  participantTag,
  buildGreeting,
  createGreetingHandler,
};
