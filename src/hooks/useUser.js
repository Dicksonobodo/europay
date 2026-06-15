import { useEffect, useState } from 'react';
import { getTransactions } from '../firebase/firestore';
import useAuth from './useAuth';

const useUser = () => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = getTransactions(currentUser.uid, (txs) => {
      setTransactions(txs);
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  return { transactions, loading };
};

export default useUser;
