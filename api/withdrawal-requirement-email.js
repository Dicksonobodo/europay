import { getAdminApp, getAdminFirestore, verifyFirebaseBearerToken } from './_lib/firebaseAdmin.js';
import { getAuth } from 'firebase-admin/auth';
import { sendRequirementEmail } from './_lib/requirementEmail.js';
import { getWithdrawalRequirementEmailCopy, resolveWithdrawalStage } from '../src/utils/withdrawal.js';

const respond = (response, status, body) => response.status(status).json(body);

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return respond(response, 405, { error: 'Method not allowed.' });
  }

  let user;
  try {
    user = await verifyFirebaseBearerToken(request.headers.authorization);
  } catch (error) {
    console.error('Withdrawal requirement email authentication failed:', error.message);
    return respond(response, 503, { error: 'Email delivery is temporarily unavailable; no email was sent.' });
  }
  if (!user) return respond(response, 401, { error: 'Sign in to request email delivery.' });

  const amountMinor = request.body?.amountMinor;
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return respond(response, 400, { error: 'Enter a valid withdrawal amount before requesting email details.' });
  }

  try {
    const adminAuth = getAuth(getAdminApp());
    const account = await adminAuth.getUser(user.uid);
    if (!account.email) return respond(response, 400, { error: 'Your account has no email address; no email was sent.' });

    const adminDb = getAdminFirestore();
    const snapshot = await adminDb.collection('users').doc(user.uid).get();
    if (!snapshot.exists) return respond(response, 404, { error: 'Account details were not found; no email was sent.' });
    const profile = snapshot.data();
    const defaultsSnapshot = await adminDb.collection('appSettings').doc('defaults').get();
    const minimumMinor = defaultsSnapshot.exists
      ? defaultsSnapshot.data().minimumWithdrawalMinor
      : 1000;
    const balanceMinor = Math.round(Number(profile.balance || 0) * 100);
    if (
      profile.isFrozen
      || profile.isSuspended
      || !Number.isSafeInteger(balanceMinor)
      || amountMinor > balanceMinor
      || !Number.isSafeInteger(minimumMinor)
      || amountMinor < minimumMinor
    ) {
      return respond(response, 400, { error: 'The requested amount is not eligible; no email was sent.' });
    }
    const stage = resolveWithdrawalStage(profile);
    const emailCopy = getWithdrawalRequirementEmailCopy(stage, profile, amountMinor);
    if (!emailCopy) {
      return respond(response, 409, { error: 'Withdrawals are enabled; no requirement email is needed.' });
    }

    const id = await sendRequirementEmail({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL,
      to: account.email,
      ...emailCopy,
    });
    return respond(response, 200, { sent: true, id });
  } catch (error) {
    console.error('Withdrawal requirement email failed:', error.message);
    return respond(response, 502, {
      error: error.message.includes('not configured')
        ? error.message
        : 'Email delivery failed; no email was confirmed as sent.',
    });
  }
}
