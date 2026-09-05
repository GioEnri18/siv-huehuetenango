import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

const ProtectedRoute = ({ rolesPermitidos }) => {
  const { user, token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(user.perfil)) {
    return <Navigate to="/dashboard" replace />; // Redirigir si no tiene permisos
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <div className="glass-panel" style={{ padding: '2rem', minHeight: '80vh' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ProtectedRoute;
