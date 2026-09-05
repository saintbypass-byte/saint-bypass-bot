import test from 'node:test';
import assert from 'node:assert/strict';
import { canUseFeature, tierPolicy } from '../src/telegram/pro-tools.js';

test('Core tier blocks premium integrations and automation', () => {
  assert.equal(canUseFeature('CORE', 'api_modules'), false);
  assert.equal(canUseFeature('CORE', 'custom_themes'), false);
  assert.equal(tierPolicy('CORE').limits.premiumAutomations, 0);
});

test('Pro tier unlocks premium features with bounded automation', () => {
  assert.equal(canUseFeature('PRO', 'api_modules'), true);
  assert.equal(canUseFeature('PRO', 'custom_themes'), true);
  assert.equal(tierPolicy('PRO').limits.premiumAutomations, 10);
});

test('Owner tier has wildcard access', () => {
  assert.equal(canUseFeature('OWNER', 'anything'), true);
  assert.equal(tierPolicy('OWNER').limits.premiumAutomations, -1);
});
