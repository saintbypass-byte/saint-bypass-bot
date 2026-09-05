import { PRO_TOOLS, API_MODULES, THEMES, safeApiPolicy } from '../src/telegram/pro-tools.js';

if (PRO_TOOLS.length !== 103) throw new Error(`expected 103 tools, got ${PRO_TOOLS.length}`);
if (API_MODULES.length !== 50) throw new Error(`expected 50 API modules, got ${API_MODULES.length}`);
if (!API_MODULES.some((tool) => tool.id === 'api.tempmail_test')) throw new Error('temp mail adapter missing');
if (!API_MODULES.some((tool) => tool.id === 'api.tempinbox')) throw new Error('QA inbox adapter missing');
if (!safeApiPolicy().includes('QA-only')) throw new Error('QA policy missing');
console.log(JSON.stringify({ tools: PRO_TOOLS.length, apiModules: API_MODULES.length, themes: Object.keys(THEMES).length }));
