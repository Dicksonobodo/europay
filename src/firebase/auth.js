import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, runTransaction, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { getStoredCurrency } from '../utils/currency';
import { generateAccountNumber } from '../utils/accountNumber';

const generateIBAN = () => {
  const checkDigits = String(Math.floor(10 + Math.random() * 90));
  const cin = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const abi = String(Math.floor(10000 + Math.random() * 90000));
  const cab = String(Math.floor(10000 + Math.random() * 90000));
  const account = String(Math.floor(100000000000 + Math.random() * 900000000000));
  return `IT${checkDigits}${cin}${abi}${cab}${account}`;
};

export const registerUser = async (email, password, fullName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await sendEmailVerification(user);

  const cardNumber = Math.floor(1000 + Math.random() * 9000);
  const iban = generateIBAN();

  const profile = {
    uid: user.uid,
    fullName,
    email,
    preferredCurrency: getStoredCurrency(),
    balance: 0,
    tier: 1,
    isPro: false,
    withdrawalStage: 'upgrade',
    role: 'user',
    cardNumber,
    iban,
    emailVerified: false,
    isFrozen: false,
    isSuspended: false,
    dailyLimit: 1000,
    createdAt: serverTimestamp(),
  };
  const userRef = doc(db, 'users', user.uid);
  let created = false;
  for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
    const accountNumber = generateAccountNumber();
    const directoryRef = doc(db, 'transferRecipients', accountNumber);
    try {
      await runTransaction(db, async (transaction) => {
        const directorySnapshot = await transaction.get(directoryRef);
        if (directorySnapshot.exists()) {
          const collision = new Error('Account number is already assigned.');
          collision.code = 'account-number/collision';
          throw collision;
        }
        transaction.set(userRef, { ...profile, accountNumber });
        transaction.set(directoryRef, {
          uid: user.uid,
          fullName,
          fullNameLower: fullName.trim().toLowerCase(),
          accountNumber,
        });
      });
      created = true;
    } catch (error) {
      if (error.code !== 'account-number/collision') throw error;
    }
  }
  if (!created) throw new Error('Could not assign a unique account number. Please try again.');

  return user;
};

export const loginUser = async (email, password) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  try {
    await addDoc(collection(db, 'users', cred.user.uid, 'loginActivity'), {
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
    });
  } catch (_) {}
  return cred;
};

export const resendVerificationEmail = async () => {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  }
};

export const logoutUser = () => signOut(auth);