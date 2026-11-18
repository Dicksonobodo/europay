import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const getAdminApp = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    const error = new Error('Firebase Admin server credentials are not configured.');
    error.code = 'firebase-admin/not-configured';
    throw error;
  }

  const app = getApps()[0] || initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
  return app;
};

export const verifyFirebaseBearerToken = async (authorization) => {
  const match = /^Bearer\s+(.+)$/i.exec(authorization || '');
  if (!match) return null;

  const auth = getAuth(getAdminApp());
  try {
    return await auth.verifyIdToken(match[1]);
  } catch (error) {
    if (error.code?.startsWith('auth/')) return null;
    throw error;
  }
};

export const getAdminFirestore = () => getFirestore(getAdminApp());
