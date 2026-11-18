import { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { ensureAccountNumber, getUser } from '../firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [accountNumberError, setAccountNumberError] = useState('');
  const [loading, setLoading] = useState(true);

  const refreshUserData = async () => {
    if (auth.currentUser) {
      const data = await getUser(auth.currentUser.uid);
      setUserData(data);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const data = await getUser(user.uid);
        if (data) {
          try {
            const accountNumber = await ensureAccountNumber(user.uid);
            setUserData({ ...data, accountNumber });
            setAccountNumberError('');
          } catch (error) {
            setUserData(data);
            setAccountNumberError(error.message || 'Could not set up your account number.');
          }
        } else {
          setUserData(data);
        }
      } else {
        setUserData(null);
        setAccountNumberError('');
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, accountNumberError, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;