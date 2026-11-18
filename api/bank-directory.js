import { verifyFirebaseBearerToken } from './_lib/firebaseAdmin.js';

const requestCounts = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

const respond = (response, status, body) => response.status(status).json(body);

const takeRateLimit = (uid, now = Date.now()) => {
  const entry = requestCounts.get(uid);
  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    requestCounts.set(uid, { startedAt: now, count: 1 });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) return false;
  entry.count += 1;
  return true;
};

const cleanBankResult = (bank) => {
  if (
    typeof bank?.bank !== 'string'
    || typeof bank?.country !== 'string'
    || typeof bank?.swift_code !== 'string'
    || !/^[A-Za-z]{4}[A-Za-z]{2}[A-Za-z0-9]{2}(?:[A-Za-z0-9]{3})?$/.test(bank.swift_code)
  ) {
    return null;
  }

  return {
    bank: bank.bank.slice(0, 160),
    country: bank.country.slice(0, 100),
    country_code: typeof bank.country_code === 'string' ? bank.country_code.slice(0, 2) : '',
    swift_code: bank.swift_code.toUpperCase(),
    city: typeof bank.city === 'string' ? bank.city.slice(0, 100) : '',
    branch: typeof bank.branch === 'string' ? bank.branch.slice(0, 120) : '',
  };
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return respond(response, 405, { error: 'Method not allowed.' });
  }

  let user;
  try {
    user = await verifyFirebaseBearerToken(request.headers.authorization);
  } catch (error) {
    console.error('Bank directory authentication failed:', error.message);
    return respond(response, 503, {
      error: error.code === 'firebase-admin/not-configured'
        ? 'Bank search server authentication is not configured. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY as server-only environment variables.'
        : 'Bank search authentication is temporarily unavailable. Check the Firebase Admin server configuration.',
    });
  }
  if (!user) return respond(response, 401, { error: 'Sign in to search the bank directory.' });
  if (!takeRateLimit(user.uid)) {
    return respond(response, 429, { error: 'Too many bank searches. Please wait a minute and try again.' });
  }

  const query = typeof request.query.query === 'string' ? request.query.query.trim() : '';
  const country = typeof request.query.country === 'string' ? request.query.country.trim() : '';
  if (query.length < 4 || query.length > 100) {
    return respond(response, 400, { error: 'Enter 4-100 characters of a bank name or SWIFT/BIC code.' });
  }
  if (country.length > 80) {
    return respond(response, 400, { error: 'Country must be 80 characters or fewer.' });
  }

  const apiKey = process.env.APIVERVE_API_KEY;
  if (!apiKey) {
    return respond(response, 503, { error: 'Bank directory lookup is not configured. You can enter bank details manually.' });
  }

  const url = new URL('https://api.apiverve.com/v1/swiftlookup');
  url.searchParams.set('swift', query);
  if (country) url.searchParams.set('country', country);

  try {
    const upstream = await fetch(url, {
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok || payload?.status !== 'ok' || !Array.isArray(payload?.data?.banks)) {
      console.error('Bank directory provider returned an error:', upstream.status);
      return respond(response, upstream.status === 429 ? 429 : 502, {
        error: upstream.status === 429
          ? 'The bank directory rate limit was reached. Please try again later.'
          : 'Bank lookup failed. Check your search or enter bank details manually.',
      });
    }

    const results = payload.data.banks.map(cleanBankResult).filter(Boolean).slice(0, 25);
    return respond(response, 200, {
      results,
      count: Number.isSafeInteger(payload.data.count) ? payload.data.count : results.length,
      source: 'APIVerve SWIFT Code Lookup',
      coverageNote: 'Periodic directory snapshot; results are not exhaustive or guaranteed current. Confirm payout details with the bank.',
    });
  } catch (error) {
    console.error('Bank directory request failed:', error.message);
    return respond(response, 502, { error: 'Bank directory lookup failed. You can enter bank details manually.' });
  }
}
