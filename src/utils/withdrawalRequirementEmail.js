import { auth } from '../firebase/config';

export const parseRequirementEmailResponse = async (response) => {
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.sent !== true) {
    throw new Error(result?.error || 'Email was not sent. You can still continue with your withdrawal request.');
  }
  return result;
};

export const sendWithdrawalRequirementEmail = async (amountMinor) => {
  if (!auth.currentUser) throw new Error('Sign in before requesting email details.');
  const token = await auth.currentUser.getIdToken();
  const response = await fetch('/api/withdrawal-requirement-email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amountMinor }),
  });
  return parseRequirementEmailResponse(response);
};
