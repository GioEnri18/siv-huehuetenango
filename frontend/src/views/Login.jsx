import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { 
  Building, ShieldCheck, Mail, KeyRound, User, CheckCircle2, Globe, 
  Sparkles, Activity, FileSpreadsheet, Syringe
} from 'lucide-react';

const Login = () => {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [step, setStep] = useState('form'); // 'form' | 'verify'

  // Campos Login
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [idioma, setIdioma] = useState('Español');
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  // Campos Registro Admin + Puesto
  const [regData, setRegData] = useState({
    nombre: '',
    usuario: '',
    correo: '',
    password: '',
    puesto_nombre: '',
    municipio: 'Huehuetenango',
    comunidad: ''
  });

  // Campos Verificación
  const [codigoVerificacion, setCodigoVerificacion] = useState('');
  const [correoPendiente, setCorreoPendiente] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(usuario, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Credenciales inválidas');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensajeExito('');
    try {
      const res = await axios.post(`${API_URL}/api/auth/register-admin`, regData);
      setCorreoPendiente(regData.correo);
      setMensajeExito(res.data.mensaje);
      if (res.data.codigo_verificacion) {
        setCodigoVerificacion(res.data.codigo_verificacion);
      }
      setStep('verify');
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al registrar el centro de salud');
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/auth/verify-code`, {
        correo: correoPendiente,
        codigo: codigoVerificacion
      });

      if (res.data.success) {
        localStorage.setItem('siv_token', res.data.token);
        localStorage.setItem('siv_user', JSON.stringify(res.data.usuario));
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Código de verificación inválido');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      width: '100vw',
      display: 'flex', 
      alignItems: 'center', 
      justify: 'center', 
      background: '#0f172a',
      padding: '2rem 1rem',
      boxSizing: 'border-box'
    }}>
      
      {/* CONTENEDOR PRINCIPAL CENTRADO (DUAL PANEL EMPRESARIAL) */}
      <div style={{ 
        width: '100%', 
        maxWidth: '1050px', 
        background: '#ffffff', 
        borderRadius: '20px', 
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        border: '1px solid #1e293b'
      }}>

        {/* PANEL IZQUIERDO: FORMULARIO DE ACCESO Y REGISTRO */}
        <div style={{ padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          
          {/* HEADER DEL FORMULARIO */}
          <div style={{ marginBottom: '1.8rem' }}>
            <div className="flex items-center gap-2 mb-2">
              <div style={{ background: '#0284c7', padding: '0.4rem', borderRadius: '10px', color: '#fff', display: 'flex' }}>
                <ShieldCheck size={24} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                República de Guatemala • MSPAS
              </span>
            </div>

            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0', letterSpacing: '-0.02em' }}>
              SIV Huehuetenango
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
              Sistema Departamental de Control de Inmunización Infantil
            </p>
          </div>

          {/* PESTAÑAS LOGIN VS REGISTRO */}
          {step === 'form' && (
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '1.5rem' }}>
              <button
                type="button"
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 700,
                  background: tab === 'login' ? '#ffffff' : 'transparent',
                  color: tab === 'login' ? '#0f172a' : '#64748b',
                  boxShadow: tab === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s'
                }}
                onClick={() => { setTab('login'); setError(''); }}
              >
                Iniciar Sesión
              </button>

              <button
                type="button"
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 700,
                  background: tab === 'register' ? '#ffffff' : 'transparent',
                  color: tab === 'register' ? '#0f172a' : '#64748b',
                  boxShadow: tab === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s'
                }}
                onClick={() => { setTab('register'); setError(''); }}
              >
                Registrar Puesto de Salud
              </button>
            </div>
          )}

          {error && <div className="badge badge-danger text-center mb-4" style={{ display: 'block', padding: '0.75rem', width: '100%', fontSize: '0.85rem' }}>{error}</div>}
          {mensajeExito && <div className="badge badge-success text-center mb-4" style={{ display: 'block', padding: '0.75rem', width: '100%', fontSize: '0.85rem' }}>{mensajeExito}</div>}

          {/* FORMULARIO LOGIN */}
          {step === 'form' && tab === 'login' && (
            <form onSubmit={handleLoginSubmit}>
              <div className="input-group">
                <label className="flex items-center gap-1">
                  <Globe size={14} color="#0284c7" /> Idioma de Interfaz
                </label>
                <select className="input-field" value={idioma} onChange={(e) => setIdioma(e.target.value)}>
                  <option>Español</option>
                  <option>Mam</option>
                  <option>Q'anjob'al</option>
                  <option>Chuj</option>
                  <option>Akateko</option>
                </select>
              </div>

              <div className="input-group">
                <label className="flex items-center gap-1">
                  <User size={14} color="#0284c7" /> Usuario o Correo
                </label>
                <input type="text" className="input-field" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Ej. FranE o admin" required />
              </div>

              <div className="input-group">
                <label className="flex items-center gap-1">
                  <KeyRound size={14} color="#0284c7" /> Contraseña
                </label>
                <input type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem', marginTop: '0.8rem' }}>
                Acceder al Sistema →
              </button>
            </form>
          )}

          {/* FORMULARIO REGISTRO */}
          {step === 'form' && tab === 'register' && (
            <form onSubmit={handleRegisterSubmit}>
              <h4 className="flex items-center gap-2 mb-2" style={{ color: '#0284c7', fontSize: '0.9rem' }}>
                <User size={16} /> Datos del Administrador
              </h4>
              <div className="input-group">
                <label>Nombre Completo</label>
                <input type="text" className="input-field" value={regData.nombre} onChange={(e)=>setRegData({...regData, nombre: e.target.value})} placeholder="Ej. Dr. Giovanni Enríquez" required />
              </div>

              <div className="flex gap-3">
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Usuario</label>
                  <input type="text" className="input-field" value={regData.usuario} onChange={(e)=>setRegData({...regData, usuario: e.target.value})} placeholder="gioenriquez" required />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Contraseña</label>
                  <input type="password" className="input-field" value={regData.password} onChange={(e)=>setRegData({...regData, password: e.target.value})} required />
                </div>
              </div>

              <div className="input-group">
                <label>Correo Electrónico</label>
                <input type="email" className="input-field" value={regData.correo} onChange={(e)=>setRegData({...regData, correo: e.target.value})} placeholder="admin@salud.gob.gt" required />
              </div>

              <h4 className="flex items-center gap-2 mt-3 mb-2" style={{ color: '#0284c7', fontSize: '0.9rem' }}>
                <Building size={16} /> Datos del Puesto de Salud
              </h4>

              <div className="input-group">
                <label>Nombre del Puesto de Salud</label>
                <input type="text" className="input-field" value={regData.puesto_nombre} onChange={(e)=>setRegData({...regData, puesto_nombre: e.target.value})} placeholder="Ej. Puesto de Salud Malacatancito" required />
              </div>

              <div className="flex gap-3">
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Municipio</label>
                  <input type="text" className="input-field" value={regData.municipio} onChange={(e)=>setRegData({...regData, municipio: e.target.value})} required />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Comunidad</label>
                  <input type="text" className="input-field" value={regData.comunidad} onChange={(e)=>setRegData({...regData, comunidad: e.target.value})} placeholder="Ej. Centro" required />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', marginTop: '0.8rem' }}>
                Registrar Puesto y Verificación
              </button>
            </form>
          )}

          {/* PASO VERIFICACIÓN */}
          {step === 'verify' && (
            <form onSubmit={handleVerifySubmit}>
              <div className="text-center mb-4">
                <Mail size={44} color="#0284c7" style={{ margin: '0 auto 0.5rem' }} />
                <h3 style={{ margin: '0.2rem 0', fontSize: '1.1rem' }}>Verificación de Correo</h3>
                <p className="text-text-muted mb-2" style={{ fontSize: '0.85rem' }}>
                  Código generado para: <strong>{correoPendiente}</strong>
                </p>
                
                {codigoVerificacion && (
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '0.8rem', margin: '0.8rem 0' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#0369a1' }}>
                      <strong>🔑 Tu código de activación:</strong> <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#0284c7', letterSpacing: '3px' }}>{codigoVerificacion}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="input-group">
                <label className="text-center" style={{ display: 'block' }}>Ingrese Código de 6 Dígitos</label>
                <input
                  type="text"
                  maxLength="6"
                  className="input-field text-center"
                  style={{ fontSize: '1.6rem', letterSpacing: '8px', fontWeight: 'bold', border: '2px solid #0284c7' }}
                  value={codigoVerificacion}
                  onChange={(e) => setCodigoVerificacion(e.target.value)}
                  placeholder="123456"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', marginTop: '1rem' }}>
                <CheckCircle2 size={18} /> Confirmar y Activar Puesto Oficial
              </button>

              <button type="button" className="btn text-text-muted mt-2" style={{ width: '100%' }} onClick={() => setStep('form')}>
                Regresar al Formulario
              </button>
            </form>
          )}

        </div>

        {/* PANEL DERECHO: HERO DE MARCA E INFORMACIÓN INSTITUCIONAL */}
        <div style={{ 
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0369a1 100%)', 
          color: '#ffffff', 
          padding: '3rem 2.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          justify: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}>
          
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.9rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)', marginBottom: '1.5rem' }}>
              <Sparkles size={16} color="#38bdf8" /> Plataforma Departamental de Salud
            </div>

            <h2 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.25, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
              Protegiendo la salud y el esquema vacunal de la niñez de Huehuetenango
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              El Sistema de Control de Inmunización Infantil (SIV) garantiza el registro nominal, seguimiento inteligente de rezagos y consolidación epidemiológica oficial para el Ministerio de Salud.
            </p>

            {/* TARJETAS DE CARACTERISTICAS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: '#0284c7', padding: '0.6rem', borderRadius: '10px', color: '#fff' }}>
                  <Syringe size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.9rem', display: 'block', color: '#ffffff' }}>Registro Nominal Vacunal (0-6 años)</strong>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Esquema completo con sugerencia PEPS/FEFO</span>
                </div>
              </div>

              <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: '#d97706', padding: '0.6rem', borderRadius: '10px', color: '#fff' }}>
                  <Activity size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.9rem', display: 'block', color: '#ffffff' }}>Alertas Tempranas de Rezago</strong>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Detección de niños atrasados con aviso WhatsApp</span>
                </div>
              </div>

              <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: '#166534', padding: '0.6rem', borderRadius: '10px', color: '#fff' }}>
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.9rem', display: 'block', color: '#ffffff' }}>Consolidados Oficiales SIGSA 3 & 6</strong>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Exportación directa a Excel y reporte PDF oficial</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
            <span>© 2026 MSPAS Guatemala • SIV</span>
            <span>Huehuetenango, C.A.</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
