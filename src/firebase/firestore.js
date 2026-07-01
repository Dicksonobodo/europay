import {
  doc, getDoc, getDocs, collection, updateDoc, increment,
  addDoc, serverTimestamp, query, orderBy, limit,
  onSnapshot, deleteDoc, where, setDoc,
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

// ── Transactions ──────────────────────────────────────────────
export const getTransactions = (uid, limitCount = 2, callback) => {
  const q = query(
    collection(db, 'users', uid, 'transactions'),
    orderBy('date', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const getAllTransactions = (uid, callback) => {
  const q = query(
    collection(db, 'users', uid, 'transactions'),
    orderBy('date', 'desc'),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

const getTodaySpent = async (uid) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const snap = await getDocs(
    query(
      collection(db, 'users', uid, 'transactions'),
      where('type', '==', 'debit'),
      where('date', '>=', start)
    )
  );
  return snap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
};

// ── Fund / Admin ──────────────────────────────────────────────
export const fundUserAccount = async (uid, amount) => {
  await updateDoc(doc(db, 'users', uid), { balance: increment(amount) });
  await addDoc(collection(db, 'users', uid, 'transactions'), {
    type: 'credit', description: 'Admin Deposit', amount, date: serverTimestamp(),
  });
  await addDoc(collection(db, 'users', uid, 'notifications'), {
    title: 'Account Funded',
    message: `€${amount.toFixed(2)} has been added to your account.`,
    read: false, createdAt: serverTimestamp(),
  });
};

export const upgradeToTier2 = async (uid) => {
  await updateDoc(doc(db, 'users', uid), { tier: 2 });
  await addDoc(collection(db, 'users', uid, 'notifications'), {
    title: 'Account Upgraded',
    message: 'Your account has been upgraded to Tier 2. You can now make withdrawals.',
    read: false, createdAt: serverTimestamp(),
  });
};

export const downgradeToTier1 = async (uid) => {
  await updateDoc(doc(db, 'users', uid), { tier: 1 });
};

export const suspendUser = async (uid, suspended) => {
  await updateDoc(doc(db, 'users', uid), { isSuspended: suspended });
};

export const deleteUserDoc = async (uid) => {
  await deleteDoc(doc(db, 'users', uid));
};

export const setDailyLimit = async (uid, limitAmount) => {
  await updateDoc(doc(db, 'users', uid), { dailyLimit: limitAmount });
};

// ── Freeze card ───────────────────────────────────────────────
export const freezeCard = async (uid, frozen) => {
  await updateDoc(doc(db, 'users', uid), { isFrozen: frozen });
  await addDoc(collection(db, 'users', uid, 'notifications'), {
    title: frozen ? 'Card Frozen' : 'Card Unfrozen',
    message: frozen
      ? 'Your card has been frozen. No transactions can be made.'
      : 'Your card has been unfrozen and is ready to use.',
    read: false, createdAt: serverTimestamp(),
  });
};

// ── Withdraw ──────────────────────────────────────────────────
export const withdrawFunds = async (uid, amount) => {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const data = snap.data();
  if (data.isFrozen) throw new Error('Your card is frozen. Unfreeze it to make transactions.');
  if (data.isSuspended) throw new Error('Your account has been suspended. Contact support.');
  if (data.balance < amount) throw new Error('Insufficient funds.');
  const todaySpent = await getTodaySpent(uid);
  if (todaySpent + amount > (data.dailyLimit || 1000)) {
    throw new Error(`Daily limit of €${data.dailyLimit || 1000} reached.`);
  }
  await updateDoc(userRef, { balance: increment(-amount) });
  await addDoc(collection(db, 'users', uid, 'transactions'), {
    type: 'debit', description: 'Withdrawal', amount, date: serverTimestamp(),
  });
};

// ── Transfer ──────────────────────────────────────────────────
export const transferFunds = async (senderUid, recipientUid, amount, recipientName) => {
  const senderRef = doc(db, 'users', senderUid);
  const snap = await getDoc(senderRef);
  const data = snap.data();
  if (data.isFrozen) throw new Error('Your card is frozen. Unfreeze it to make transactions.');
  if (data.isSuspended) throw new Error('Your account has been suspended. Contact support.');
  if (data.balance < amount) throw new Error('Insufficient funds.');
  const todaySpent = await getTodaySpent(senderUid);
  if (todaySpent + amount > (data.dailyLimit || 1000)) {
    throw new Error(`Daily limit of €${data.dailyLimit || 1000} reached.`);
  }
  await updateDoc(senderRef, { balance: increment(-amount) });
  await addDoc(collection(db, 'users', senderUid, 'transactions'), {
    type: 'debit', description: `Transfer to ${recipientName}`, amount, date: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', recipientUid), { balance: increment(amount) });
  const senderName = data.fullName;
  await addDoc(collection(db, 'users', recipientUid, 'transactions'), {
    type: 'credit', description: `Transfer from ${senderName}`, amount, date: serverTimestamp(),
  });
  await addDoc(collection(db, 'users', recipientUid, 'notifications'), {
    title: 'Money Received',
    message: `You received €${amount.toFixed(2)} from ${senderName}.`,
    read: false, createdAt: serverTimestamp(),
  });
};

// ── Search helpers ────────────────────────────────────────────
export const getUserByEmail = async (email) => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => d.data()).find((u) => u.email === email) || null;
};

export const getUserByAccountNumber = async (q) => {
  const snap = await getDocs(collection(db, 'users'));
  const users = snap.docs.map((d) => d.data());
  const q2 = q.trim().toUpperCase();
  return users.find((u) => u.iban?.toUpperCase() === q2 || String(u.cardNumber) === q2) || null;
};

// ── PIN ───────────────────────────────────────────────────────
export const savePin = async (uid, hashedPin) => {
  await updateDoc(doc(db, 'users', uid), { pin: hashedPin });
};

// ── Login Activity ────────────────────────────────────────────
export const getLoginActivity = (uid, callback) => {
  const q = query(
    collection(db, 'users', uid, 'loginActivity'),
    orderBy('timestamp', 'desc'),
    limit(10)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

// ── Notifications ─────────────────────────────────────────────
export const getNotifications = (uid, callback) => {
  const q = query(
    collection(db, 'users', uid, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const markNotificationRead = async (uid, notifId) => {
  await updateDoc(doc(db, 'users', uid, 'notifications', notifId), { read: true });
};

export const markAllNotificationsRead = async (uid) => {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'notifications'), where('read', '==', false))
  );
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { read: true })));
};

// ── Request Money ─────────────────────────────────────────────
export const sendMoneyRequest = async (fromUid, fromName, toUid, amount, note) => {
  await addDoc(collection(db, 'moneyRequests'), {
    fromUid, fromName, toUid, amount,
    note: note || '', status: 'pending', createdAt: serverTimestamp(),
  });
  await addDoc(collection(db, 'users', toUid, 'notifications'), {
    title: 'Money Request',
    message: `${fromName} is requesting €${amount.toFixed(2)} from you.${note ? ` Note: "${note}"` : ''}`,
    read: false, createdAt: serverTimestamp(),
  });
};

export const getMoneyRequests = (uid, callback) => {
  const q = query(
    collection(db, 'moneyRequests'),
    where('toUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const getSentRequests = (uid, callback) => {
  const q = query(
    collection(db, 'moneyRequests'),
    where('fromUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const approveMoneyRequest = async (requestId, payerUid, recipientUid, amount, recipientName) => {
  await transferFunds(payerUid, recipientUid, amount, recipientName);
  await updateDoc(doc(db, 'moneyRequests', requestId), { status: 'approved' });
  await addDoc(collection(db, 'users', recipientUid, 'notifications'), {
    title: 'Request Approved',
    message: `Your request for €${amount.toFixed(2)} has been approved.`,
    read: false, createdAt: serverTimestamp(),
  });
};

export const declineMoneyRequest = async (requestId, fromUid, amount) => {
  await updateDoc(doc(db, 'moneyRequests', requestId), { status: 'declined' });
  await addDoc(collection(db, 'users', fromUid, 'notifications'), {
    title: 'Request Declined',
    message: `Your request for €${amount.toFixed(2)} was declined.`,
    read: false, createdAt: serverTimestamp(),
  });
};

// ── Scheduled Transfers ───────────────────────────────────────
export const createScheduledTransfer = async (senderUid, data) => {
  await addDoc(collection(db, 'users', senderUid, 'scheduledTransfers'), {
    ...data, status: 'active', createdAt: serverTimestamp(),
  });
};

export const getScheduledTransfers = (uid, callback) => {
  const q = query(
    collection(db, 'users', uid, 'scheduledTransfers'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const cancelScheduledTransfer = async (uid, transferId) => {
  await updateDoc(doc(db, 'users', uid, 'scheduledTransfers', transferId), { status: 'cancelled' });
};

// ── Split Bill ────────────────────────────────────────────────
export const createSplitBill = async (creatorUid, creatorName, participants, totalAmount, description) => {
  const perPerson = totalAmount / (participants.length + 1);
  const splitRef = await addDoc(collection(db, 'splitBills'), {
    creatorUid, creatorName, description, totalAmount, perPerson,
    participants: participants.map((p) => ({ ...p, status: 'pending' })),
    createdAt: serverTimestamp(), status: 'active',
  });
  for (const p of participants) {
    await addDoc(collection(db, 'users', p.uid, 'notifications'), {
      title: 'Split Bill Request',
      message: `${creatorName} added you to a split bill: "${description}". Your share is €${perPerson.toFixed(2)}.`,
      read: false, createdAt: serverTimestamp(),
    });
  }
  return splitRef.id;
};

export const getSplitBills = (uid, callback) => {
  const q = query(
    collection(db, 'splitBills'),
    where('creatorUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const getIncomingSplitBills = (uid, callback) => {
  const q = query(
    collection(db, 'splitBills'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(all.filter((b) => b.participants?.some((p) => p.uid === uid)));
  });
};

export const paySplitBill = async (billId, payerUid, creatorUid, creatorName, amount) => {
  await transferFunds(payerUid, creatorUid, amount, creatorName);
  const billRef = doc(db, 'splitBills', billId);
  const snap = await getDoc(billRef);
  const bill = snap.data();
  const updatedParticipants = bill.participants.map((p) =>
    p.uid === payerUid ? { ...p, status: 'paid' } : p
  );
  await updateDoc(billRef, { participants: updatedParticipants });
};

// ── Budgets ───────────────────────────────────────────────────
export const saveBudget = async (uid, category, amount) => {
  await setDoc(
    doc(db, 'users', uid, 'budgets', category),
    { category, amount, updatedAt: new Date() },
    { merge: true }
  );
};

export const getBudgets = (uid, callback) => {
  return onSnapshot(collection(db, 'users', uid, 'budgets'), (snap) => {
    const budgets = {};
    snap.docs.forEach((d) => { budgets[d.id] = d.data().amount; });
    callback(budgets);
  });
};

// ── Audit Log ─────────────────────────────────────────────────
export const logAdminAction = async (adminUid, adminName, action, targetName = '', details = '') => {
  await addDoc(collection(db, 'auditLog'), {
    adminUid, adminName, action, targetName, details,
    createdAt: serverTimestamp(),
  });
};

export const getAuditLog = (callback) => {
  const q = query(collection(db, 'auditLog'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

// ── Admin Stats ───────────────────────────────────────────────
export const getAdminStats = async () => {
  const usersSnap = await getDocs(collection(db, 'users'));
  const users = usersSnap.docs.map((d) => d.data());
  const totalUsers = users.filter((u) => u.role !== 'admin').length;
  const totalBalance = users.reduce((s, u) => s + (u.balance || 0), 0);
  const tier2Users = users.filter((u) => u.tier === 2).length;
  const suspendedUsers = users.filter((u) => u.isSuspended).length;
  const frozenUsers = users.filter((u) => u.isFrozen).length;
  return { totalUsers, totalBalance, tier2Users, suspendedUsers, frozenUsers };
};