"use strict";

const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40 });
const SENSITIVE_KEY = /token|password|secret|authorization|pairing|session|owner(number)?/i;

function redact(value, key = "") {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redact(childValue, childKey)]));
  }
  return value;
}

function createLogger({ level = process.env.LOG_LEVEL || "info", context = {}, write = (line) => process.stdout.write(`${line}\n`) } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;

  function log(logLevel, event, fields = {}) {
    if (LEVELS[logLevel] < threshold) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      event,
      ...redact(context),
      ...redact(fields),
    };
    write(JSON.stringify(entry));
  }

  return {
    debug: (event, fields) => log("debug", event, fields),
    info: (event, fields) => log("info", event, fields),
    warn: (event, fields) => log("warn", event, fields),
    error: (event, errorOrFields, fields = {}) => {
      const error = errorOrFields instanceof Error ? errorOrFields : null;
      const data = error ? { ...fields, error } : errorOrFields || fields;
      log("error", event, data);
    },
    child: (childContext) => createLogger({ level, context: { ...context, ...childContext }, write }),
  };
}

module.exports = { LEVELS, redact, createLogger };
