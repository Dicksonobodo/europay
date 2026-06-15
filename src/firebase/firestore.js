import {
  doc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './config';

export const getUser = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

export const getAllUsers = async () => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => d.data());
};

export const fundUserAccount = async (uid, amount) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { balance: increment(amount) });
  await addDoc(collection(db, 'users', uid, 'transactions'), {
    type: 'credit',
    description: 'Admin Deposit',
    amount,
    date: serverTimestamp(),
  });
};

export const upgradeToTier2 = async (uid) => {
  await updateDoc(doc(db, 'users', uid), { tier: 2 });
};

export const downgradeToTier1 = async (uid) => {
  await updateDoc(doc(db, 'users', uid), { tier: 1 });
};

export const deleteUserDoc = async (uid) => {
  await deleteDoc(doc(db, 'users', uid));
};

export const getTransactions = (uid, callback) => {
  const q = query(
    collection(db, 'users', uid, 'transactions'),
    orderBy('date', 'desc'),
    limit(10)
  );
  return onSnapshot(q, (snap) => {
    const txs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(txs);
  });
};

export const withdrawFunds = async (uid, amount) => {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const balance = snap.data().balance;
  if (balance < amount) throw new Error('Insufficient funds');
  await updateDoc(userRef, { balance: increment(-amount) });
  await addDoc(collection(db, 'users', uid, 'transactions'), {
    type: 'debit',
    description: 'Withdrawal',
    amount,
    date: serverTimestamp(),
  });
};

export const transferFunds = async (senderUid, recipientUid, amount, recipientName) => {
  const senderRef = doc(db, 'users', senderUid);
  const snap = await getDoc(senderRef);
  const balance = snap.data().balance;
  if (balance < amount) throw new Error('Insufficient funds');

  await updateDoc(senderRef, { balance: increment(-amount) });
  await addDoc(collection(db, 'users', senderUid, 'transactions'), {
    type: 'debit',
    description: `Transfer to ${recipientName}`,
    amount,
    date: serverTimestamp(),
  });

  await updateDoc(doc(db, 'users', recipientUid), { balance: increment(amount) });
  const senderSnap = await getDoc(senderRef);
  const senderName = senderSnap.data().fullName;
  await addDoc(collection(db, 'users', recipientUid, 'transactions'), {
    type: 'credit',
    description: `Transfer from ${senderName}`,
    amount,
    date: serverTimestamp(),
  });
};

export const getUserByEmail = async (email) => {
  const snap = await getDocs(collection(db, 'users'));
  const users = snap.docs.map((d) => d.data());
  return users.find((u) => u.email === email) || null;
};

// Search by IBAN or 4-digit card number
export const getUserByAccountNumber = async (query) => {
  const snap = await getDocs(collection(db, 'users'));
  const users = snap.docs.map((d) => d.data());
  const q = query.trim().toUpperCase();
  return users.find(
    (u) =>
      u.iban?.toUpperCase() === q ||
      String(u.cardNumber) === q
  ) || null;
};