"use strict";

function toError(error) {
  return error instanceof Error ? error : new Error(String(error));
}

async function handleError({ logger, error, event = "runtime.error", context = {}, reply, publicMessage = "⚠️ Something went wrong while processing that request." }) {
  const normalized = toError(error);
  logger?.error(event, normalized, context);
  if (typeof reply === "function") {
    try {
      await reply(publicMessage);
    } catch (replyError) {
      logger?.error("error.reply_failed", replyError, { originalEvent: event });
    }
  }
  return { handled: true, error: normalized };
}

function wrapHandler(handler, options = {}) {
  if (typeof handler !== "function") throw new TypeError("handler must be a function");
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError({ ...options, error });
    }
  };
}

module.exports = { toError, handleError, wrapHandler };
