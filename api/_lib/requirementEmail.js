export const sendRequirementEmail = async ({
  apiKey,
  from,
  to,
  subject,
  text,
  fetchImpl = fetch,
}) => {
  if (!apiKey || !from) {
    throw new Error('Email delivery is not configured; no email was sent.');
  }
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error('Email delivery failed; no email was confirmed as sent.');
  }
  const result = await response.json().catch(() => null);
  if (typeof result?.id !== 'string' || !result.id) {
    throw new Error('Email delivery was not confirmed; no email was confirmed as sent.');
  }
  return result.id;
};
