import assert from 'node:assert/strict';
import test from 'node:test';
import { sendRequirementEmail } from './requirementEmail.js';

const emailOptions = {
  apiKey: 'test-key',
  from: 'Europay <withdrawals@example.com>',
  to: 'user@example.com',
  subject: 'Withdrawal information',
  text: 'Informational only.',
};

test('confirms email delivery only when Resend returns a message ID', async () => {
  const id = await sendRequirementEmail({
    ...emailOptions,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ id: 'email_test_123' }),
    }),
  });
  assert.equal(id, 'email_test_123');
});

test('reports provider errors as unsent and never returns success-shaped fallback', async () => {
  await assert.rejects(() => sendRequirementEmail({
    ...emailOptions,
    fetchImpl: async () => ({ ok: false }),
  }), /no email was confirmed as sent/);
  await assert.rejects(() => sendRequirementEmail({
    ...emailOptions,
    fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
  }), /not confirmed/);
});

test('does not attempt delivery when server mail configuration is missing', async () => {
  let called = false;
  await assert.rejects(() => sendRequirementEmail({
    ...emailOptions,
    apiKey: '',
    fetchImpl: async () => { called = true; },
  }), /not configured; no email was sent/);
  assert.equal(called, false);
});
