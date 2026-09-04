"use strict";

/**
 * Link moderation is deliberately transport-agnostic. The feature decides
 * whether a message violates policy and delegates the actual deletion to the
 * injected connection adapter.
 */

const DEFAULT_LINK_PATTERN = /(?:https?:\/\/|www\.)\S+|(?:chat\.whatsapp\.com|t\.me|discord\.gg|wa\.me|bit\.ly|youtu\.be)\/\S*/i;

function extractText(message = {}) {
  return (
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.imageMessage?.caption ||
    message.message?.videoMessage?.caption ||
    ""
  );
}

function isGroupJid(jid = "") {
  return jid.endsWith("@g.us");
}

function getSenderJid(message = {}) {
  return message.key?.participant || message.participant || message.key?.remoteJid || "";
}

function isMessageFromBot(message = {}) {
  return message.key?.fromMe === true;
}

function createAntiLinkPolicy(options = {}) {
  const {
    enabled = false,
    allowFromMe = true,
    allowOwner = true,
    ownerJids = [],
    linkPattern = DEFAULT_LINK_PATTERN,
  } = options;

  const owners = new Set(ownerJids);

  return {
    enabled,
    shouldModerate(message = {}) {
      const jid = message.key?.remoteJid || "";
      const sender = getSenderJid(message);
      const text = extractText(message);

      if (!enabled || !isGroupJid(jid)) return false;
      if (allowFromMe && isMessageFromBot(message)) return false;
      if (allowOwner && owners.has(sender)) return false;
      return linkPattern.test(text);
    },
  };
}

async function deleteMessage({ conn, message }) {
  if (!conn || typeof conn.sendMessage !== "function") {
    throw new TypeError("A WhatsApp connection with sendMessage() is required");
  }

  const jid = message.key?.remoteJid;
  if (!jid || !message.key?.id) {
    throw new TypeError("A message with remoteJid and id is required");
  }

  await conn.sendMessage(jid, {
    delete: {
      remoteJid: jid,
      fromMe: false,
      id: message.key.id,
      participant: message.key.participant || message.participant,
    },
  });
}

async function handleAntiLink({ conn, message, policy, onError = console.error }) {
  if (!policy || typeof policy.shouldModerate !== "function") {
    throw new TypeError("An anti-link policy is required");
  }

  if (!policy.shouldModerate(message)) {
    return { matched: false, deleted: false };
  }

  try {
    await deleteMessage({ conn, message });
    return { matched: true, deleted: true };
  } catch (error) {
    onError("Anti-link deletion failed", error);
    return { matched: true, deleted: false, error };
  }
}

module.exports = {
  DEFAULT_LINK_PATTERN,
  extractText,
  isGroupJid,
  getSenderJid,
  createAntiLinkPolicy,
  deleteMessage,
  handleAntiLink,
};

module.exports.default = module.exports;
