import { auth } from '../firebase/config';
import { buildBankSearchParams, parseBankDirectoryResponse } from './bankDirectoryData';

export {
  buildBankSearchParams,
  normalizeBankResults,
  parseBankDirectoryResponse,
} from './bankDirectoryData';

export const searchBanks = async ({ query, country = '', signal }) => {
  if (!auth.currentUser) throw new Error('Sign in to search the bank directory.');

  const token = await auth.currentUser.getIdToken();
  const params = buildBankSearchParams({ query, country });

  const response = await fetch(`/api/bank-directory?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Bank search API did not return JSON. Use the Vercel API-enabled development server or deploy the app with its API function.');
  }
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error || 'The bank directory is unavailable. You can enter bank details manually.');
  }

  return {
    results: parseBankDirectoryResponse(result),
    count: Number.isSafeInteger(result?.count) ? result.count : 0,
    source: typeof result?.source === 'string' ? result.source : 'Bank directory',
    coverageNote: typeof result?.coverageNote === 'string' ? result.coverageNote : '',
  };
};
