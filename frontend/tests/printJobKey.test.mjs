import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createPrintJobKey } from '../src/components/printJobKey.js';

test('LAN HTTP without randomUUID produces backend-compatible unique keys', () => {
  const provider = { getRandomValues: bytes => webcrypto.getRandomValues(bytes) };
  const keys = Array.from({ length: 100 }, () => createPrintJobKey(provider));
  assert.equal(new Set(keys).size, keys.length);
  for (const key of keys) assert.match(key, /^[a-zA-Z0-9_-]{16,80}$/);
});
test('secure contexts use randomUUID and missing crypto gives a visible error', () => {
  assert.equal(createPrintJobKey({ randomUUID: () => 'test-uuid' }), 'test-uuid');
  assert.throws(() => createPrintJobKey({}), /Trình duyệt/);
});
