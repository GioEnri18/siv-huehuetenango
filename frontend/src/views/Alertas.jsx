import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { ShieldAlert, Sparkles, Clock, CheckCircle2, RefreshCw, MessageSquare } from 'lucide-react';
import { getCache, saveCache, CACHE_KEYS } from '../utils/offlineManager';

const Alertas = () => {
  const [alertas, setAlertas] = useState([]);
  const [ninos, setNinos] = useState([]);
  const [biologicos, setBiologicos] = useState([]);
  const [tutores, setTutores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const fetchData = async () => {
    setLoading(true);
    if (navigator.onLine) {
      try {
        const [resAlertas, resNinos, resBiologicos, resTutores] = await Promise.all([
          axios.get(`${API_URL}/api/alerta_rezago`),
          axios.get(`${API_URL}/api/nino`),
          axios.get(`${API_URL}/api/biologico`),
          axios.get(`${API_URL}/api/tutor`)
        ]);
        setAlertas(resAlertas.data);
        setNinos(resNinos.data);
        setBiologicos(resBiologicos.data);
        setTutores(resTutores.data);

        saveCache('siv_cache_alertas', resAlertas.data);
        saveCache(CACHE_KEYS.NINOS, resNinos.data);
        saveCache(CACHE_KEYS.BIOLOGICOS, resBiologicos.data);
        saveCache(CACHE_KEYS.TUTORES, resTutores.data);
        setIsOffline(false);
      } catch (error) {
        console.warn('Usando datos de alertas en caché:', error);
        setIsOffline(true);
        setAlertas(getCache('siv_cache_alertas', []));
        setNinos(getCache(CACHE_KEYS.NINOS, []));
        setBiologicos(getCache(CACHE_KEYS.BIOLOGICOS, []));
        setTutores(getCache(CACHE_KEYS.TUTORES, []));
      } finally {
        setLoading(false);
      }
    } else {
      setIsOffline(true);
      setAlertas(getCache('siv_cache_alertas', []));
      setNinos(getCache(CACHE_KEYS.NINOS, []));
      setBiologicos(getCache(CACHE_KEYS.BIOLOGICOS, []));
      setTutores(getCache(CACHE_KEYS.TUTORES, []));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEscaneoManual = async () => {
    setScanning(true);
    try {
      const res = await axios.post(`${API_URL}/api/dashboard/scan-rezago`);
      fetchData();
    } catch (error) {
      console.warn('Error en escaneo manual de rezagos');
    } finally {
      setScanning(false);
    }
  };

  const marcarResuelta = async (alertaId) => {
    if (navigator.onLine) {
      try {
        await axios.put(`${API_URL}/api/alerta_rezago/${alertaId}`, { estado: 'Resuelta' });
        fetchData();
        return;
      } catch (error) {
        console.warn('Error al actualizar estado en servidor');
      }
    }

    const actualizadas = alertas.map(a => a.id === alertaId ? { ...a, estado: 'Resuelta' } : a);
    setAlertas(actualizadas);
    saveCache('siv_cache_alertas', actualizadas);
  };

  const handleEnviarWhatsApp = (alerta) => {
    const n = ninos.find(x => String(x.id) === String(alerta.nino_id));
    const bio = getBiologicoNombre(alerta.biologico_id);
    const tut = tutores.find(t => String(t.id) === String(n?.tutor_id));
    const tel = tut?.telefono || '55551234';
    const nombreTutor = tut?.nombre || 'Estimada Madre / Tutor';
    const nombreNino = n ? `${n.nombres}` : 'su niño/a';

    const texto = `Hola ${nombreTutor}, le saludamos de la Red de Puestos de Salud de Huehuetenango. Le recordamos que ${nombreNino} tiene pendiente la vacuna de ${bio}. ¡Le esperamos para mantener al día su esquema!`;
    const url = `https://api.whatsapp.com/send?phone=502${tel.replace(/\D/g, '')}&text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  const getNinoNombre = (id) => {
    const n = ninos.find(x => String(x.id) === String(id));
    return n ? `${n.nombres} ${n.apellidos}` : `Niño ID: ${id}`;
  };
  
  const getBiologicoNombre = (id) => biologicos.find(x => String(x.id) === String(id))?.nombre || `Vacuna #${id}`;

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando alertas de rezago...</div>;

  const alertasPendientes = alertas.filter(a => a.estado !== 'Resuelta');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* HEADER PRINCIPAL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldAlert size={28} color="#d97706" /> Alertas Automáticas de Rezago Vacunal
          </h1>
          <p className="text-text-muted" style={{ fontSize: '0.9rem' }}>
            Motor de detección automática de vacunas pendientes según esquema de edad MSPAS.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleEscaneoManual} disabled={scanning || isOffline} style={{ background: '#0284c7', borderColor: '#0284c7' }}>
          <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} /> {scanning ? 'Escaneando...' : 'Re-Actualizar Alertas'}
        </button>
      </div>

      {/* BANNER EXPLICATIVO MOTOR AUTOMATICO */}
      <div style={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        border: '1px solid #bae6fd',
        borderRadius: '12px',
        padding: '1rem 1.2rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        color: '#0369a1'
      }}>
        <Sparkles size={22} color="#0284c7" />
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: '0.9rem', display: 'block', color: '#0c4a6e' }}>
            ✔ Generación y Resolución 100% Automática
          </strong>
          <span style={{ fontSize: '0.82rem', color: '#0369a1' }}>
            No requiere creación manual. El sistema evalúa la edad de cada niño en tiempo real, genera las alertas de rezago requeridas y las marca como <strong>Resueltas</strong> automáticamente cuando se aplica la dosis.
          </span>
        </div>
      </div>

      {/* METRICAS KPI DE ALERTAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.2rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Alertas Pendientes</span>
          <h2 style={{ margin: '0.4rem 0 0', fontSize: '2rem', color: '#d97706' }}>{alertasPendientes.length}</h2>
        </div>
        <div className="glass-panel" style={{ padding: '1.2rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Prioridad Crítica</span>
          <h2 style={{ margin: '0.4rem 0 0', fontSize: '2rem', color: '#dc2626' }}>
            {alertasPendientes.filter(a => a.prioridad === 'Crítica').length}
          </h2>
        </div>
        <div className="glass-panel" style={{ padding: '1.2rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Alertas Resueltas</span>
          <h2 style={{ margin: '0.4rem 0 0', fontSize: '2rem', color: '#16a34a' }}>
            {alertas.filter(a => a.estado === 'Resuelta').length}
          </h2>
        </div>
      </div>

      {/* TABLA DE ALERTAS */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Prioridad</th>
              <th>Paciente</th>
              <th>Vacuna Pendiente</th>
              <th>Atraso Estimado</th>
              <th>Estado</th>
              <th>Acciones de Seguimiento</th>
            </tr>
          </thead>
          <tbody>
            {alertas.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                  🎉 ¡Excelente! No existen alertas de rezago pendietes en este momento.
                </td>
              </tr>
            ) : (
              alertas.map((a) => {
                const esCritica = a.prioridad === 'Crítica';
                const esAlta = a.prioridad === 'Alta';
                const esResuelta = a.estado === 'Resuelta';

                return (
                  <tr key={a.id} style={{ opacity: esResuelta ? 0.65 : 1 }}>
                    <td>
                      {esResuelta ? (
                        <span className="badge badge-success">Completado</span>
                      ) : esCritica ? (
                        <span className="badge badge-danger">Crítica</span>
                      ) : esAlta ? (
                        <span className="badge badge-warning">Alta</span>
                      ) : (
                        <span className="badge badge-primary">Media</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                      {getNinoNombre(a.nino_id)}
                    </td>
                    <td>
                      <strong style={{ color: '#0284c7' }}>{getBiologicoNombre(a.biologico_id)}</strong>
                    </td>
                    <td>
                      {a.dias_atraso > 0 ? `${a.dias_atraso} días de atraso` : 'Próxima a vencer'}
                    </td>
                    <td>
                      {esResuelta ? (
                        <span className="badge badge-success" style={{ gap: '0.3rem' }}>
                          <CheckCircle2 size={13} /> Vacunado / Resuelto
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ gap: '0.3rem' }}>
                          <Clock size={13} /> Pendiente
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {!esResuelta && (
                          <>
                            <button
                              onClick={() => handleEnviarWhatsApp(a)}
                              className="btn"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', background: '#25d366', color: '#ffffff', borderColor: '#25d366', fontWeight: 700 }}
                              title="Notificar por WhatsApp al tutor"
                            >
                              <MessageSquare size={13} /> WhatsApp
                            </button>
                            <button
                              onClick={() => marcarResuelta(a.id)}
                              className="btn"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            >
                              Marcar Atendido
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default Alertas;
