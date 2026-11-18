import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminFirestore, verifyFirebaseBearerToken } from './_lib/firebaseAdmin.js';
import { isValidAccountNumber } from '../src/utils/accountNumber.js';

const respond = (response, status, body) => response.status(status).json(body);

const reject = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return respond(response, 405, { error: 'Method not allowed.' });
  }

  let user;
  try {
    user = await verifyFirebaseBearerToken(request.headers.authorization);
  } catch (error) {
    console.error('Transfer authentication failed:', error.message);
    return respond(response, 503, { error: 'Transfers are temporarily unavailable.' });
  }
  if (!user) return respond(response, 401, { error: 'Sign in to find a recipient or send a transfer.' });

  if (request.method === 'GET') {
    const search = String(request.query?.query || '').trim();
    if (search.length < 2) {
      return respond(response, 400, { error: 'Enter at least two characters to find a recipient.' });
    }

    try {
      const db = getAdminFirestore();
      const recipients = [];
      const compactSearch = search.replace(/\s/g, '');
      if (isValidAccountNumber(compactSearch)) {
        const recipient = await db.collection('transferRecipients').doc(compactSearch).get();
        if (recipient.exists && recipient.data().uid !== user.uid) {
          const { uid, fullName, accountNumber } = recipient.data();
          recipients.push({ uid, fullName, accountNumber });
        }
      } else if (search.includes('@')) {
        try {
          const account = await getAuth(getAdminApp()).getUserByEmail(search.toLowerCase());
          const profile = await db.collection('users').doc(account.uid).get();
          const accountNumber = profile.data()?.accountNumber;
          if (profile.exists && account.uid !== user.uid && isValidAccountNumber(accountNumber)) {
            const recipient = await db.collection('transferRecipients').doc(accountNumber).get();
            if (recipient.exists && recipient.data().uid === account.uid
              && recipient.data().fullName === profile.data().fullName) {
              const { uid, fullName } = recipient.data();
              recipients.push({ uid, fullName, accountNumber });
            }
          }
        } catch (error) {
          if (error.code !== 'auth/user-not-found') throw error;
        }
      } else if (!/^\d+$/.test(search)) {
        const matches = await db.collection('transferRecipients')
          .where('fullNameLower', '>=', search.toLowerCase())
          .where('fullNameLower', '<=', `${search.toLowerCase()}\uf8ff`)
          .orderBy('fullNameLower')
          .limit(20)
          .get();
        matches.docs.forEach((item) => {
          if (item.data().uid !== user.uid) {
            const { uid, fullName, accountNumber } = item.data();
            recipients.push({ uid, fullName, accountNumber });
          }
        });
      }
      return respond(response, 200, { recipients });
    } catch (error) {
      console.error('Recipient search failed:', error.message);
      return respond(response, 500, { error: 'Recipient search is temporarily unavailable.' });
    }
  }

  const { accountNumber, amountMinor } = request.body || {};
  if (!isValidAccountNumber(accountNumber)) {
    return respond(response, 400, { error: 'Enter a valid 12-digit recipient account number.' });
  }
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return respond(response, 400, { error: 'Enter a valid transfer amount.' });
  }

  try {
    const db = getAdminFirestore();
    const senderRef = db.collection('users').doc(user.uid);
    const recipientDirectoryRef = db.collection('transferRecipients').doc(accountNumber);
    const senderTransactionRef = db.collection('users').doc(user.uid).collection('transactions').doc();
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);

    const receipt = await db.runTransaction(async (transaction) => {
      const dailyDebitsQuery = senderRef.collection('transactions')
        .where('type', '==', 'debit')
        .where('date', '>=', dayStart);
      const [senderSnapshot, directorySnapshot, dailyDebits] = await Promise.all([
        transaction.get(senderRef),
        transaction.get(recipientDirectoryRef),
        transaction.get(dailyDebitsQuery),
      ]);
      if (!senderSnapshot.exists) reject(404, 'Sender account not found.');
      if (!directorySnapshot.exists) reject(404, 'No Europay account matches that account number.');

      const sender = senderSnapshot.data();
      const recipientUid = directorySnapshot.data().uid;
      if (recipientUid === user.uid) reject(400, 'You cannot transfer money to your own account.');
      const recipientRef = db.collection('users').doc(recipientUid);
      const recipientSnapshot = await transaction.get(recipientRef);
      if (!recipientSnapshot.exists) reject(404, 'Recipient account not found.');
      if (sender.isFrozen) reject(403, 'Your card is frozen. Unfreeze it to make transactions.');
      if (sender.isSuspended) reject(403, 'Your account has been suspended. Contact support.');

      const senderBalanceMinor = Math.round(Number(sender.balance || 0) * 100);
      const recipientBalanceMinor = Math.round(Number(recipientSnapshot.data().balance || 0) * 100);
      if (!Number.isSafeInteger(senderBalanceMinor) || amountMinor > senderBalanceMinor) {
        reject(400, 'Insufficient funds.');
      }
      if (!Number.isSafeInteger(recipientBalanceMinor)
        || !Number.isSafeInteger(recipientBalanceMinor + amountMinor)) {
        reject(409, 'Recipient balance cannot accept this transfer.');
      }

      const amount = amountMinor / 100;
      const todaySpentMinor = dailyDebits.docs.reduce(
        (total, item) => total + Math.round(Number(item.data().amount || 0) * 100),
        0
      );
      const dailyLimitMinor = Math.round(Number(sender.dailyLimit || 1000) * 100);
      if (!Number.isSafeInteger(todaySpentMinor)
        || !Number.isSafeInteger(dailyLimitMinor)
        || todaySpentMinor + amountMinor > dailyLimitMinor) {
        reject(400, `Daily limit of €${Number(sender.dailyLimit || 1000).toFixed(2)} reached.`);
      }

      const recipient = recipientSnapshot.data();
      if (recipient.accountNumber !== accountNumber
        || directorySnapshot.data().fullName !== recipient.fullName) {
        reject(409, 'Recipient account details could not be verified.');
      }
      const recipientTransactionRef = recipientRef.collection('transactions').doc();
      transaction.update(senderRef, { balance: (senderBalanceMinor - amountMinor) / 100 });
      transaction.update(recipientRef, { balance: (recipientBalanceMinor + amountMinor) / 100 });
      transaction.set(senderTransactionRef, {
        type: 'debit',
        description: `Transfer to ${recipient.fullName}`,
        amount,
        date: FieldValue.serverTimestamp(),
      });
      transaction.set(recipientTransactionRef, {
        type: 'credit',
        description: `Transfer from ${sender.fullName}`,
        amount,
        date: FieldValue.serverTimestamp(),
      });
      transaction.set(recipientRef.collection('notifications').doc(), {
        title: 'Money Received',
        message: `You received €${amount.toFixed(2)} from ${sender.fullName}.`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        recipient: {
          uid: recipientUid,
          fullName: recipient.fullName,
          accountNumber: recipient.accountNumber,
        },
        reference: senderTransactionRef.id,
      };
    });

    return respond(response, 200, receipt);
  } catch (error) {
    if (!error.status) console.error('Internal transfer failed:', error.message);
    return respond(response, error.status || 500, {
      error: error.status ? error.message : 'Transfer failed. Please try again.',
    });
  }
}
