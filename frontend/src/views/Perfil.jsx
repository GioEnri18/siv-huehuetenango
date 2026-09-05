import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Building, MapPin, KeyRound, Globe, Award } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';

const ROLE_COLORS = {
  'Administrador': { bg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', text: '#ffffff', badgeBg: '#dbeafe', badgeText: '#1e40af' },
  'Director de Área': { bg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', text: '#ffffff', badgeBg: '#f3e8ff', badgeText: '#6b21a8' },
  'Estadígrafo': { bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)', text: '#ffffff', badgeBg: '#d1fae5', badgeText: '#065f46' },
  'Enfermero': { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', text: '#ffffff', badgeBg: '#fef3c7', badgeText: '#92400e' }
};

const Perfil = () => {
  const { user } = useAuth();
  const [idioma, setIdioma] = useState('Español');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  const roleStyle = ROLE_COLORS[user?.perfil] || ROLE_COLORS['Administrador'];

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    try {
      await axios.put(`${API_URL}/api/usuario/${user.id}`, {
        password_hash: nuevaPassword
      });
      setMensajeExito('Contraseña actualizada correctamente.');
      setNuevaPassword('');
      setShowPasswordModal(false);
    } catch (error) {
      alert('Error al actualizar la contraseña');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* BANNER PRINCIPAL DEL PERFIL */}
      <div className="glass-panel mb-4" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(241,245,249,0.9) 100%)', position: 'relative', overflow: 'hidden', borderTop: `6px solid ${roleStyle.badgeText}` }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2rem' }}>
          
          {/* AVATAR CIRCULAR CON GRADIENTE DE ROL */}
          <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: roleStyle.bg, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 'bold', boxShadow: '0 8px 20px rgba(0,0,0,0.18)' }}>
            {getInitials(user?.nombre || user?.usuario)}
          </div>

          {/* DATOS GENERALES */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.8rem' }}>{user?.nombre || user?.usuario}</h1>
              <span style={{ background: roleStyle.badgeBg, color: roleStyle.badgeText, padding: '0.3rem 0.9rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Shield size={16} /> {user?.perfil || 'Personal de Salud'}
              </span>
            </div>

            <p className="text-text-muted mb-2 flex items-center gap-2" style={{ fontSize: '0.95rem' }}>
              <span>@{user?.usuario}</span> • <span>{user?.correo || 'Sin correo configurado'}</span>
            </p>

            <div className="flex items-center gap-3 text-text-muted" style={{ fontSize: '0.9rem' }}>
              <span className="flex items-center gap-1">
                <Building size={16} color="var(--primary)" /> <strong>{user?.puesto_nombre || 'Puesto de Salud Huehuetenango'}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin size={16} color="var(--primary)" /> {user?.municipio || 'Huehuetenango'}, {user?.comunidad || 'Centro'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {mensajeExito && (
        <div className="badge badge-success mb-4 text-center" style={{ display: 'block', padding: '0.8rem', fontSize: '0.95rem' }}>
          {mensajeExito}
        </div>
      )}

      {/* SECCIÓN DETALLADA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* TARJETA 1: FICHA Y PERMISOS DEL ROL */}
        <div className="glass-panel" style={{ padding: '1.8rem' }}>
          <h3 className="flex items-center gap-2 mb-4" style={{ color: 'var(--primary)' }}>
            <Award size={22} /> Perfil y Permisos del Sistema
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(241, 245, 249, 0.7)', padding: '1rem', borderRadius: '8px' }}>
              <span className="text-text-muted" style={{ fontSize: '0.8rem', display: 'block' }}>Rol Asignado</span>
              <strong style={{ fontSize: '1.1rem', color: roleStyle.badgeText }}>{user?.perfil}</strong>
            </div>

            <div style={{ background: 'rgba(241, 245, 249, 0.7)', padding: '1rem', borderRadius: '8px' }}>
              <span className="text-text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>Capacidades y Accesos</span>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem', color: 'var(--text)', lineHeight: '1.6' }}>
                {user?.perfil === 'Administrador' && (
                  <>
                    <li>Gestión completa de Puestos de Salud</li>
                    <li>Creación y administración de Usuarios</li>
                    <li>Registro Nominal de Inmunización</li>
                    <li>Acceso total a Reportes y Alertas</li>
                  </>
                )}
                {user?.perfil === 'Enfermero' && (
                  <>
                    <li>Registro Nominal de Pacientes Infantiles</li>
                    <li>Aplicación e inscripción de Dosis de Vacunas</li>
                    <li>Consulta de Esquemas de Inmunización</li>
                    <li>Seguimiento de Alertas de Rezago</li>
                  </>
                )}
                {user?.perfil === 'Estadígrafo' && (
                  <>
                    <li>Generación de Reportes y Cobertura Vacunal</li>
                    <li>Seguimiento de Alertas de Rezago</li>
                    <li>Consulta del Registro Nominal</li>
                  </>
                )}
                {user?.perfil === 'Director de Área' && (
                  <>
                    <li>Supervisión de Tablero y Métricas de Área</li>
                    <li>Generación de Reportes Ejecutivos</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* TARJETA 2: PREFERENCIAS Y SEGURIDAD */}
        <div className="glass-panel" style={{ padding: '1.8rem' }}>
          <h3 className="flex items-center gap-2 mb-4" style={{ color: 'var(--primary)' }}>
            <Globe size={22} /> Preferencias e Idioma
          </h3>

          <div className="input-group">
            <label>Idioma Preferido de Interfaz</label>
            <select className="input-field" value={idioma} onChange={(e) => setIdioma(e.target.value)}>
              <option>Español</option>
              <option>Mam</option>
              <option>Q'anjob'al</option>
              <option>Chuj</option>
              <option>Akateko</option>
            </select>
          </div>

          <h3 className="flex items-center gap-2 mt-4 mb-2" style={{ color: 'var(--primary)' }}>
            <KeyRound size={22} /> Seguridad de la Cuenta
          </h3>
          <p className="text-text-muted mb-4" style={{ fontSize: '0.88rem' }}>
            Mantén tu contraseña segura para proteger la información del Registro Nominal Infantil.
          </p>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowPasswordModal(true)}>
            <KeyRound size={18} /> Cambiar Mi Contraseña
          </button>
        </div>
      </div>

      {/* MODAL DE CAMBIO DE CONTRASEÑA */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '420px' }}>
            <h3 className="flex items-center gap-2 mb-3">
              <KeyRound size={22} color="var(--primary)" /> Actualizar Contraseña
            </h3>
            <form onSubmit={handleCambiarPassword}>
              <div className="input-group">
                <label>Nueva Contraseña</label>
                <input
                  type="password"
                  className="input-field"
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  placeholder="Ingrese nueva contraseña..."
                  minLength="6"
                  required
                />
              </div>

              <div className="flex justify-between mt-4">
                <button type="button" className="btn" onClick={() => setShowPasswordModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Contraseña</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Perfil;
