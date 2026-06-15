import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Generate Italian-style IBAN: IT + 2 check digits + 1 letter + 10 digits + 12 digits
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

  const cardNumber = Math.floor(1000 + Math.random() * 9000);
  const iban = generateIBAN();

  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    fullName,
    email,
    balance: 0,
    tier: 1,
    role: 'user',
    cardNumber,
    iban,
    createdAt: serverTimestamp(),
  });

  return user;
};

export const loginUser = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const logoutUser = () => signOut(auth);