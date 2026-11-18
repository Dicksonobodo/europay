import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import AdminRoute from './routes/AdminRoute';
import Onboarding from './pages/Onboarding';

import Splash from './pages/Splash';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transfer from './pages/Transfer';
import Withdraw from './pages/Withdraw';
import Profile from './pages/Profile';
import Support from './pages/Support';
import AdminPanel from './pages/AdminPanel';
import RequestMoney from './pages/RequestMoney';
import ScheduledTransfers from './pages/ScheduledTransfers';
import SplitBill from './pages/SplitBill';
import Analytics from './pages/Analytics';
import TransactionHistory from './pages/TransactionHistory';
import { CurrencyProvider } from './context/CurrencyContext.jsx';

const AppRoutes = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const onboardingDone = localStorage.getItem('europay_onboarding_done');
    localStorage.removeItem('europay_pin');
    if (!onboardingDone) setShowOnboarding(true);
  }, []);

  const handleOnboardingFinish = () => {
    localStorage.setItem('europay_onboarding_done', 'true');
    setShowOnboarding(false);
  };

  if (showOnboarding) return <Onboarding onFinish={handleOnboardingFinish} />;

  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/transfer" element={<PrivateRoute><Transfer /></PrivateRoute>} />
      <Route path="/withdraw" element={<PrivateRoute><Withdraw /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/support" element={<PrivateRoute><Support /></PrivateRoute>} />
      <Route path="/request" element={<PrivateRoute><RequestMoney /></PrivateRoute>} />
      <Route path="/scheduled" element={<PrivateRoute><ScheduledTransfers /></PrivateRoute>} />
      <Route path="/split" element={<PrivateRoute><SplitBill /></PrivateRoute>} />
      <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
      <Route path="/transactions" element={<PrivateRoute><TransactionHistory /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute><AdminRoute><AdminPanel /></AdminRoute></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App;