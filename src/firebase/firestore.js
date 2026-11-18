import {
  doc, getDoc, getDocs, collection, updateDoc, increment,
  addDoc, serverTimestamp, query, orderBy, limit,
  onSnapshot, deleteDoc, where, setDoc, Timestamp, runTransaction,
} from 'firebase/firestore';
import { auth, db } from './config';
import { generateAccountNumber, isValidAccountNumber } from '../utils/accountNumber';
import {
  WITHDRAWAL_STAGES,
  validateWithdrawalRequirement,
  validateWithdrawalRequirementAmounts,
} from '../utils/withdrawal';

export const getUser = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

export const updateUserPreferredCurrency = async (uid, preferredCurrency) => {
  await updateDoc(doc(db, 'users', uid), { preferredCurrency });
};

export const getAllUsers = async () => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
};

export const ensureAccountNumber = async (uid) => {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('You must be signed in to set up your account number.');
  }
  const userRef = doc(db, 'users', uid);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateAccountNumber();
    try {
      return await runTransaction(db, async (transaction) => {
        const userSnapshot = await transaction.get(userRef);
        if (!userSnapshot.exists()) throw new Error('Account not found.');
        const user = userSnapshot.data();
        const accountNumber = isValidAccountNumber(user.accountNumber)
          ? user.accountNumber
          : candidate;
        const directoryRef = doc(db, 'transferRecipients', accountNumber);
        const directorySnapshot = await transaction.get(directoryRef);

        if (directorySnapshot.exists()) {
          if (directorySnapshot.data().uid !== uid) {
            if (!isValidAccountNumber(user.accountNumber)) {
              const collision = new Error('Account number is already assigned.');
              collision.code = 'account-number/collision';
              throw collision;
            }
            throw new Error('Your account number directory entry is inconsistent.');
          }
          return accountNumber;
        }

        if (!isValidAccountNumber(user.accountNumber)) {
          transaction.update(userRef, { accountNumber });
        }
        transaction.set(directoryRef, {
          uid,
          fullName: user.fullName,
          fullNameLower: String(user.fullName || '').trim().toLowerCase(),
          accountNumber,
        });
        return accountNumber;
      });
    } catch (error) {
      if (error.code !== 'account-number/collision') throw error;
    }
  }

  throw new Error('Could not assign a unique account number. Please try again.');
};

export const getTransferRecipients = async (search) => {
  if (!auth.currentUser) throw new Error('Sign in to find a transfer recipient.');
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`/api/transfer?query=${encodeURIComponent(search)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Recipient search failed.');
  if (!Array.isArray(result.recipients)) {
    throw new Error('Recipient search returned an invalid response.');
  }
  return result.recipients;
};

export const sendAccountTransfer = async (accountNumber, amountMinor) => {
  if (!auth.currentUser) throw new Error('Sign in to send a transfer.');
  const token = await auth.currentUser.getIdToken();
  const response = await fetch('/api/transfer', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accountNumber, amountMinor }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not send this transfer.');
  if (!result.recipient?.uid || !result.reference) {
    throw new Error('The transfer response was incomplete. Check your transaction history before retrying.');
  }
  return result;
};

export const updateUserJoinedDate = async (uid, dateValue) => {
  const parsed = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid date');
  await updateDoc(doc(db, 'users', uid), { createdAt: Timestamp.fromDate(parsed) });
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

const notifyTransactionRefresh = (uid) => {
  if (typeof window === 'undefined') return;
  const payload = { uid, ts: Date.now() };
  window.dispatchEvent(new CustomEvent('europay-tx-refresh', { detail: payload }));
  localStorage.setItem('europay_tx_refresh', JSON.stringify(payload));
};

export const getAllTransactionsList = async (uid) => {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'transactions'), orderBy('date', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const updateTransactionDate = async (uid, txId, dateValue) => {
  const parsed = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid date');
  await updateDoc(doc(db, 'users', uid, 'transactions', txId), { date: Timestamp.fromDate(parsed) });
  notifyTransactionRefresh(uid);
};

export const deleteTransaction = async (uid, txId) => {
  const transactionRef = doc(db, 'users', uid, 'transactions', txId);
  const snapshot = await getDoc(transactionRef);
  if (snapshot.exists() && snapshot.data().withdrawalId) {
    throw new Error('Withdrawal request records cannot be deleted from transaction history.');
  }
  await deleteDoc(transactionRef);
  notifyTransactionRefresh(uid);
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
  await updateDoc(doc(db, 'users', uid), {
    tier: 2,
    isPro: true,
    withdrawalStage: 'enabled',
  });
  await addDoc(collection(db, 'users', uid, 'notifications'), {
    title: 'Account Upgraded',
    message: 'Your account has been upgraded to Tier 2. You can now make withdrawals.',
    read: false, createdAt: serverTimestamp(),
  });
};

export const downgradeToTier1 = async (uid) => {
  await updateDoc(doc(db, 'users', uid), {
    tier: 1,
    isPro: false,
    withdrawalStage: 'upgrade',
  });
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
export const withdrawFunds = async (uid, amountMinor, method, payout) => {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('You must be signed in to request a withdrawal.');
  }
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('Enter a valid withdrawal amount.');
  }
  if (!['bitcoin', 'card', 'bank', 'wire'].includes(method)) {
    throw new Error('Choose a supported withdrawal method.');
  }

  const userRef = doc(db, 'users', uid);
  const amount = amountMinor / 100;
  const todaySpent = await getTodaySpent(uid);
  const withdrawalRef = doc(collection(db, 'users', uid, 'withdrawals'));
  const transactionRef = doc(collection(db, 'users', uid, 'transactions'));
  const safePayout = {
    destination: String(payout?.destination || '').slice(0, 200),
    beneficiary: String(payout?.beneficiary || '').slice(0, 200),
  };
  if (!safePayout.destination) throw new Error('Payout destination is required.');
  if (method === 'card') {
    safePayout.cardBrand = String(payout?.cardBrand || '').slice(0, 40);
    safePayout.cardLast4 = /^\d{4}$/.test(payout?.cardLast4 || '') ? payout.cardLast4 : '';
    safePayout.cardExpiry = /^\d{2}\/\d{2}$/.test(payout?.cardExpiry || '') ? payout.cardExpiry : '';
    if (!safePayout.cardLast4 || !safePayout.cardExpiry) {
      throw new Error('Card details are incomplete.');
    }
  }
  if (method === 'bank') {
    safePayout.bankName = String(payout?.bankName || '').slice(0, 100);
    safePayout.country = String(payout?.country || '').slice(0, 100);
    safePayout.accountLast4 = /^[A-Za-z0-9]{1,4}$/.test(payout?.accountLast4 || '')
      ? payout.accountLast4
      : '';
    safePayout.routingCodeLast4 = String(payout?.routingCodeLast4 || '').slice(0, 4);
    const swift = String(payout?.swift || '').toUpperCase();
    if (swift) safePayout.swift = swift;
    if (!safePayout.bankName || !safePayout.country || !safePayout.accountLast4) {
      throw new Error('Bank details are incomplete.');
    }
  }

  const result = await runTransaction(db, async (transaction) => {
    const defaultsRef = doc(db, 'appSettings', 'defaults');
    const [snapshot, defaultsSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(defaultsRef),
    ]);
    if (!snapshot.exists()) throw new Error('Account not found.');
    const data = snapshot.data();
    const defaults = defaultsSnapshot.exists() ? defaultsSnapshot.data() : {};
    const minimumWithdrawalMinor = defaults.minimumWithdrawalMinor ?? 1000;
    if (!Number.isSafeInteger(minimumWithdrawalMinor) || minimumWithdrawalMinor <= 0) {
      throw new Error('Withdrawal settings are invalid. Contact support.');
    }
    if (amountMinor < minimumWithdrawalMinor) {
      throw new Error(`The minimum withdrawal is €${(minimumWithdrawalMinor / 100).toFixed(2)}.`);
    }
    if (data.isFrozen) throw new Error('Your account is frozen. Contact support before requesting a withdrawal.');
    if (data.isSuspended) throw new Error('Your account has been suspended. Contact support.');

    const balanceMinor = Math.round(Number(data.balance || 0) * 100);
    if (!Number.isSafeInteger(balanceMinor) || amountMinor > balanceMinor) {
      throw new Error('Insufficient funds.');
    }
    const dailyLimit = Number(data.dailyLimit || 1000);
    if (todaySpent + amount > dailyLimit) {
      throw new Error(`Daily limit of €${dailyLimit} reached.`);
    }

    transaction.update(userRef, {
      balance: (balanceMinor - amountMinor) / 100,
      lastWithdrawalId: withdrawalRef.id,
    });
    transaction.set(withdrawalRef, {
      amountMinor,
      currency: 'EUR',
      method,
      ...safePayout,
      transactionId: transactionRef.id,
      status: 'manual_review',
      processingMode: 'simulated_manual',
      createdAt: serverTimestamp(),
    });
    transaction.set(transactionRef, {
      type: 'debit',
      description: 'Withdrawal request (manual review)',
      amount,
      withdrawalId: withdrawalRef.id,
      status: 'manual_review',
      date: serverTimestamp(),
    });
    return { id: withdrawalRef.id, status: 'manual_review' };
  });

  notifyTransactionRefresh(uid);
  return result;
};

export const getRecentWithdrawals = async (uid, limitCount = 5) => {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('You must be signed in to view withdrawal history.');
  }
  const snapshot = await getDocs(query(
    collection(db, 'users', uid, 'withdrawals'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
};

const assertCurrentUserIsAdmin = async () => {
  const caller = auth.currentUser;
  if (!caller) throw new Error('You must be signed in to perform this action.');
  const callerSnapshot = await getDoc(doc(db, 'users', caller.uid));
  if (!callerSnapshot.exists() || callerSnapshot.data().role !== 'admin') {
    throw new Error('Admin access is required.');
  }
};

export const setWithdrawalSettings = async (uid, settings) => {
  await assertCurrentUserIsAdmin();
  const {
    stage,
    requiredAmountMinor,
    processingFeeMinor,
    requirement,
  } = settings;
  if (!WITHDRAWAL_STAGES.includes(stage)) throw new Error('Choose a valid withdrawal stage.');
  const amountsError = validateWithdrawalRequirementAmounts({
    stage,
    requiredAmountMinor,
    processingFeeMinor,
  });
  if (amountsError) throw new Error(amountsError);
  const requirementError = validateWithdrawalRequirement(requirement, stage);
  if (requirementError) throw new Error(requirementError);

  const updates = {
    withdrawalStage: stage,
    requiredAmountMinor,
    processingFeeMinor,
    withdrawalRequirementCurrency: 'EUR',
    withdrawalRequirement: {
      status: requirement.status,
      reason: requirement.reason.trim(),
      upgradeReason: (requirement.upgradeReason || (stage === 'upgrade' ? requirement.reason : '')).trim(),
      processingFeeReason: (requirement.processingFeeReason || (stage === 'processing_fee' ? requirement.reason : '')).trim(),
      instructions: '',
    },
    withdrawalSettingsUpdatedAt: serverTimestamp(),
  };
  if (stage === 'enabled') {
    updates.isPro = true;
    updates.tier = 2;
  }
  await updateDoc(doc(db, 'users', uid), updates);
  return {
    withdrawalStage: stage,
    requiredAmountMinor,
    processingFeeMinor,
    withdrawalRequirementCurrency: 'EUR',
    withdrawalRequirement: {
      status: requirement.status,
      reason: requirement.reason.trim(),
      upgradeReason: (requirement.upgradeReason || (stage === 'upgrade' ? requirement.reason : '')).trim(),
      processingFeeReason: (requirement.processingFeeReason || (stage === 'processing_fee' ? requirement.reason : '')).trim(),
      instructions: '',
    },
    ...(stage === 'enabled' ? { isPro: true, tier: 2 } : {}),
  };
};

export const getAppDefaults = async () => {
  const snapshot = await getDoc(doc(db, 'appSettings', 'defaults'));
  return snapshot.exists() ? snapshot.data() : {};
};

export const setAppDefaults = async ({ upgradePlanId, minimumWithdrawalMinor }) => {
  await assertCurrentUserIsAdmin();
  if (typeof upgradePlanId !== 'string' || upgradePlanId.length > 100) {
    throw new Error('Enter a valid upgrade plan ID.');
  }
  if (!Number.isSafeInteger(minimumWithdrawalMinor) || minimumWithdrawalMinor <= 0) {
    throw new Error('The minimum withdrawal must be greater than zero.');
  }
  await setDoc(doc(db, 'appSettings', 'defaults'), {
    upgradePlanId: upgradePlanId.trim(),
    minimumWithdrawalMinor,
    updatedAt: serverTimestamp(),
  }, { merge: true });
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
  return users.find((u) => u.accountNumber?.toUpperCase() === q2) || null;
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

export const deleteNotification = async (uid, notifId) => {
  await deleteDoc(doc(db, 'users', uid, 'notifications', notifId));
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

// ── Profile Picture ───────────────────────────────────────────
export const updateProfilePicture = async (uid, photoURL) => {
  await updateDoc(doc(db, 'users', uid), { photoURL });
};