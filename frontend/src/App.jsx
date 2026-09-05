import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

// Lazy loading de vistas para optimización de fragmentación (code-splitting)
const Login = lazy(() => import('./views/Login'));
const Dashboard = lazy(() => import('./views/Dashboard'));
const RegistroNominal = lazy(() => import('./views/RegistroNominal'));
const Alertas = lazy(() => import('./views/Alertas'));
const Usuarios = lazy(() => import('./views/Usuarios'));
const PuestosSalud = lazy(() => import('./views/PuestosSalud'));
const Perfil = lazy(() => import('./views/Perfil'));
const VacunasInfo = lazy(() => import('./views/VacunasInfo'));
const IncidentesVacunas = lazy(() => import('./views/IncidentesVacunas'));
const ReportesSIGSA = lazy(() => import('./views/ReportesSIGSA'));
const MapaCobertura = lazy(() => import('./views/MapaCobertura'));
const IngresoVacunas = lazy(() => import('./views/IngresoVacunas'));
const SalidaVacunas = lazy(() => import('./views/SalidaVacunas'));

// Spinner de carga liviano para transiciones de rutas
const PageLoader = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    color: '#0284c7',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '4px solid #e2e8f0',
      borderTop: '4px solid #0284c7',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      marginBottom: '1rem'
    }} />
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    <p style={{ fontSize: '0.95rem', fontWeight: '500', color: '#64748b' }}>Cargando módulo...</p>
  </div>
);

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/vacunas-info" element={<VacunasInfo />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>

              <Route element={<ProtectedRoute rolesPermitidos={['Enfermero', 'Estadígrafo', 'Director de Área', 'Administrador']} />}>
                <Route path="/ingreso-vacunas" element={<IngresoVacunas />} />
                <Route path="/salida-vacunas" element={<SalidaVacunas />} />
                <Route path="/incidentes" element={<IncidentesVacunas />} />
              </Route>

              <Route element={<ProtectedRoute rolesPermitidos={['Estadígrafo', 'Director de Área', 'Administrador']} />}>
                <Route path="/reportes-sigsa" element={<ReportesSIGSA />} />
                <Route path="/mapa-cobertura" element={<MapaCobertura />} />
              </Route>

              <Route element={<ProtectedRoute rolesPermitidos={['Enfermero', 'Administrador']} />}>
                <Route path="/registro" element={<RegistroNominal />} />
              </Route>

              <Route element={<ProtectedRoute rolesPermitidos={['Estadígrafo', 'Director de Área', 'Administrador', 'Enfermero']} />}>
                <Route path="/alertas" element={<Alertas />} />
              </Route>

              <Route element={<ProtectedRoute rolesPermitidos={['Administrador']} />}>
                <Route path="/puestos" element={<PuestosSalud />} />
                <Route path="/usuarios" element={<Usuarios />} />
              </Route>
              
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;

