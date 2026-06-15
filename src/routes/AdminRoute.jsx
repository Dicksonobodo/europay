import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const AdminRoute = ({ children }) => {
  const { userData, loading } = useAuth();
  if (loading) return null;
  return userData?.role === 'admin' ? children : <Navigate to="/dashboard" />;
};

export default AdminRoute;
