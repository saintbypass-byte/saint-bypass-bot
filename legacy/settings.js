// Saint Bypass Bot identity and runtime configuration
const ownerNumber = require('./Owner/owner');

const config = {
  ownerNumber,
  ownerName: 'saintbypass',
  botName: 'SAINTBYPASS PRO BOT',
  signature: '> SAINTBYPASS',
  prefix: '!',
  telegram: 'https://t.me/saintbypassstarlink',
  github: 'https://github.com/saintbypass-byte',
  startupBanner: './media/saintbypass-banner.png',

  // Feature defaults
  autoTyping: false,
  autoReact: false,
  autoStatusView: false,
  public: true,
  antiLink: false,
  antiBug: false,
  greetings: true,
  readmore: false,
  ANTIDELETE: true,
};

global.owner = (Array.isArray(ownerNumber) ? ownerNumber : [ownerNumber])
  .map((num) => num.replace(/\D/g, '') + '@s.whatsapp.net');

function loadSettings() {
  return config;
}

module.exports = { loadSettings };
