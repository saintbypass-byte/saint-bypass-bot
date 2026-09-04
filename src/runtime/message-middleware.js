"use strict";

const { createAntiLinkPolicy, handleAntiLink } = require("../features/anti-link");

function createMessageMiddleware({ config = {}, logger = console } = {}) {
  const policy = createAntiLinkPolicy({
    enabled: config.antiLink === true,
    allowFromMe: config.antiLinkAllowFromMe !== false,
    allowOwner: config.antiLinkAllowOwner !== false,
    ownerJids: config.ownerJids || [],
  });

  return async function processMessage({ conn, message }) {
    const moderation = await handleAntiLink({
      conn,
      message,
      policy,
      onError: (label, error) => logger.error?.(label, error),
    });

    return {
      moderation,
      shouldContinue: !moderation.deleted,
    };
  };
}

module.exports = { createMessageMiddleware };
