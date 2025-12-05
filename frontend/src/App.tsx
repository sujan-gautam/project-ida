import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import axios from 'axios';
import Homepage from './pages/Homepage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Analyzer from './pages/Analyzer';
import ApiDocumentation from './pages/ApiDocumentation';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminApiKeys from './pages/admin/AdminApiKeys';
import AdminApiSandbox from './pages/admin/AdminApiSandbox';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500"></div>
          <p className="mt-6 text-xl text-slate-300 font-medium">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const checkAdmin = async () => {
      if (!isAuthenticated) {
        setCheckingAdmin(false);
        return;
      }
      
      try {
        // Try to access admin endpoint to verify admin status
        const token = localStorage.getItem('token');
        await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/dashboard`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setIsAdmin(true);
      } catch (error: any) {
        if (error.response?.status === 403) {
          setIsAdmin(false);
        }
      } finally {
        setCheckingAdmin(false);
      }
    };
    
    checkAdmin();
  }, [isAuthenticated]);
  
  if (isLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500"></div>
          <p className="mt-6 text-xl text-slate-300 font-medium">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/api-docs" element={<ApiDocumentation />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analyzer"
            element={
              <ProtectedRoute>
                <Analyzer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analyzer/:id"
            element={
              <ProtectedRoute>
                <Analyzer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/api-keys"
            element={
              <AdminRoute>
                <AdminApiKeys />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/sandbox"
            element={
              <AdminRoute>
                <AdminApiSandbox />
              </AdminRoute>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  );
};

export default App;

