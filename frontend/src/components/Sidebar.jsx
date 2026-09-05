import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Users, Activity, LogOut, FilePlus, Building, 
  UserCircle, Syringe, AlertTriangle, FileSpreadsheet, MapPin, ShieldCheck,
  PackagePlus, PackageMinus
} from 'lucide-react';
import OfflineSyncStatus from './OfflineSyncStatus';

const Sidebar = () => {
  const { user, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
  };

  return (
    <aside className="sidebar">
      {/* BRANDING HEADER INSTITUCIONAL */}
      <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '1rem' }}>
        <div className="flex items-center gap-2.5 mb-2">
          <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', padding: '0.45rem', borderRadius: '10px', color: '#ffffff', display: 'flex', boxShadow: '0 4px 8px rgba(2,132,199,0.3)' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '1.15rem', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
              SIV Huehue
            </h2>
            <span style={{ fontSize: '0.72rem', color: '#38bdf8', display: 'block', fontWeight: 700 }}>
              MSPAS • Inmunización Vacunal
            </span>
          </div>
        </div>

        <div className="mt-3">
          <OfflineSyncStatus />
        </div>
      </div>

      {/* MENU DE NAVEGACION */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.8rem', flex: 1 }}>
        
        <NavLink to="/dashboard" style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: '8px',
          fontWeight: 600, fontSize: '0.86rem', color: isActive ? '#38bdf8' : '#cbd5e1',
          background: isActive ? '#1e293b' : 'transparent', borderLeft: isActive ? '3px solid #0284c7' : '3px solid transparent'
        })}>
          <LayoutDashboard size={18} /> Tablero Principal
        </NavLink>

        <NavLink to="/perfil" style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: '8px',
          fontWeight: 600, fontSize: '0.86rem', color: isActive ? '#38bdf8' : '#cbd5e1',
          background: isActive ? '#1e293b' : 'transparent', borderLeft: isActive ? '3px solid #0284c7' : '3px solid transparent'
        })}>
          <UserCircle size={18} /> Mi Perfil
        </NavLink>

        <NavLink to="/vacunas-info" style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: '8px',
          fontWeight: 600, fontSize: '0.86rem', color: isActive ? '#38bdf8' : '#cbd5e1',
          background: isActive ? '#1e293b' : 'transparent', borderLeft: isActive ? '3px solid #0284c7' : '3px solid transparent'
        })}>
          <Syringe size={18} /> Esquema de Vacunas
        </NavLink>

        {/* INVENTARIO: INGRESOS Y SALIDAS */}
        <NavLink to="/ingreso-vacunas" style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: '8px',
          fontWeight: 600, fontSize: '0.86rem', color: isActive ? '#38bdf8' : '#cbd5e1',
          background: isActive ? '#1e293b' : 'transparent', borderLeft: isActive ? '3px solid #0284c7' : '3px solid transparent'
        })}>
          <PackagePlus size={18} /> Ingreso de Vacunas
        </NavLink>

        <NavLink to="/salida-vacunas" style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: '8px',
          fontWeight: 600, fontSize: '0.86rem', color: isActive ? '#38bdf8' : '#cbd5e1',
          background: isActive ? '#1e293b' : 'transparent', borderLeft: isActive ? '3px solid #0284c7' : '3px solid transparent'
        })}>
          <PackageMinus size={18} /> Salida de Vacunas
        </NavLink>

        {(user?.perfil === 'Enfermero' || user?.perfil === 'Administrador') && (
          <>
            <NavLink to="/registro" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: '8px',
              fontWeight: 600, fontSize: '0.86rem', color: isActive ? '#38bdf8' : '#cbd5e1',
              background: isActive ? '#1e293b' : 'transparent', borderLeft: isActive ? '3px solid #0284c7' : '3px solid transparent'
            })}>
              <FilePlus size={18} /> Registro Nominal
            </NavLink>
            <NavLink to="/incidentes" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: '8px',
              fontWeight: 600, fontSize: '0.86rem', color: isActive ? '#38bdf8' : '#cbd5e1',
              background: isActive ? '#1e293b' : 'transparent', borderLeft: isActive ? '3px solid #0284c7' : '3px solid transparent'
            })}>
              <AlertTriangle size={18} /> Dosis Dañadas
            </NavLink>
          </>
        )}


        {(user?.perfil !== 'Enfermero' || user?.perfil === 'Administrador') && (
          <NavLink to="/alertas" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: '8px',
            fontWeight: 600, fontSize: '0.86rem', color: isActive ? '#38bdf8' : '#cbd5e1',
            background: isActive ? '#1e293b' : 'transparent', borderLeft: isActive ? '3px solid #0284c7' : '3px solid transparent'
          })}>
            <Activity size={18} /> Alertas de Rezago
          </NavLink>
        )}

        {(user?.perfil === 'Estadígrafo' || user?.perfil === 'Director de Área' || user?.perfil === 'Administrador') && (
          <>
            <NavLink to="/reportes-sigsa" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: '8px',
              fontWeight: 600, fontSize: '0.86rem', color: isActive ? '#38bdf8' : '#cbd5e1',
              background: isActive ? '#1e293b' : 'transparent', borderLeft: isActive ? '3px solid #0284c7' : '3px solid transparent'
            })}>
              <FileSpreadsheet size={18} /> Reportes SIGSA
            </NavLink>
            <NavLink to="/mapa-cobertura" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: '8px',
              fontWeight: 600, fontSize: '0.86rem', color: isActive ? '#38bdf8' : '#cbd5e1',
              background: isActive ? '#1e293b' : 'transparent', borderLeft: isActive ? '3px solid #0284c7' : '3px solid transparent'
            })}>
              <MapPin size={18} /> Mapa Cobertura
            </NavLink>
          </>
        )}

        {user?.perfil === 'Administrador' && (
          <>
            <NavLink to="/puestos" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: '8px',
              fontWeight: 600, fontSize: '0.86rem', color: isActive ? '#38bdf8' : '#cbd5e1',
              background: isActive ? '#1e293b' : 'transparent', borderLeft: isActive ? '3px solid #0284c7' : '3px solid transparent'
            })}>
              <Building size={18} /> Puestos de Salud
            </NavLink>
            <NavLink to="/usuarios" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: '8px',
              fontWeight: 600, fontSize: '0.86rem', color: isActive ? '#38bdf8' : '#cbd5e1',
              background: isActive ? '#1e293b' : 'transparent', borderLeft: isActive ? '3px solid #0284c7' : '3px solid transparent'
            })}>
              <Users size={18} /> Cuentas de Personal
            </NavLink>
          </>
        )}
      </nav>

      {/* PIE DE SIDEBAR: USUARIO CONECTADO */}
      <div style={{ borderTop: '1px solid #1e293b', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <div className="flex items-center gap-3">
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
            {getInitials(user?.nombre || user?.usuario)}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f8fafc', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.nombre || user?.usuario}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'block' }}>
              {user?.perfil}
            </span>
          </div>
        </div>

        <button 
          onClick={logout} 
          style={{ 
            width: '100%', padding: '0.55rem', borderRadius: '8px', background: '#334155', color: '#f8fafc', 
            fontSize: '0.82rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            transition: 'background 0.15s'
          }}
        >
          <span>Cerrar Sesión</span>
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
