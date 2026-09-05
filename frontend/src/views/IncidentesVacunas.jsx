import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { AlertTriangle, Plus, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveCache, getCache, addToOfflineQueue, CACHE_KEYS } from '../utils/offlineManager';
import { useToast } from '../components/Toast';

const IncidentesVacunas = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [incidentes, setIncidentes] = useState([]);
  const [biologicos, setBiologicos] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [formData, setFormData] = useState({
    biologico_id: '',
    lote: '',
    puesto_id: user?.puesto_id || '',
    tipo_incidente: 'Ruptura de Cadena de Frío',
    cantidad_afectada: 1,
    fecha_incidente: new Date().toISOString().split('T')[0],
    descripcion: ''
  });

  const fetchData = async () => {
    setLoading(true);
    if (navigator.onLine) {
      try {
        const [resInc, resBio, resPues] = await Promise.all([
          axios.get(`${API_URL}/api/incidente_dosis`),
          axios.get(`${API_URL}/api/biologico`),
          axios.get(`${API_URL}/api/puesto_salud`)
        ]);
        setIncidentes(resInc.data);
        setBiologicos(resBio.data);
        setPuestos(resPues.data);

        saveCache('siv_cache_incidentes', resInc.data);
        saveCache(CACHE_KEYS.BIOLOGICOS, resBio.data);
        saveCache(CACHE_KEYS.PUESTOS, resPues.data);
        setIsOffline(false);
      } catch (error) {
        console.warn('Usando datos de incidentes en caché:', error);
        setIsOffline(true);
        setIncidentes(getCache('siv_cache_incidentes', []));
        setBiologicos(getCache(CACHE_KEYS.BIOLOGICOS, []));
        setPuestos(getCache(CACHE_KEYS.PUESTOS, []));
      } finally {
        setLoading(false);
      }
    } else {
      setIsOffline(true);
      setIncidentes(getCache('siv_cache_incidentes', []));
      setBiologicos(getCache(CACHE_KEYS.BIOLOGICOS, []));
      setPuestos(getCache(CACHE_KEYS.PUESTOS, []));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenModal = () => {
    setFormData({
      biologico_id: biologicos[0]?.id || '',
      lote: '',
      puesto_id: user?.puesto_id || puestos[0]?.id || 1,
      tipo_incidente: 'Ruptura de Cadena de Frío',
      cantidad_afectada: 1,
      fecha_incidente: new Date().toISOString().split('T')[0],
      descripcion: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (navigator.onLine) {
      try {
        await axios.post(`${API_URL}/api/incidente_dosis`, formData);
        showToast('Reporte de dosis dañada enviado exitosamente.', 'success', '¡Incidente Reportado!');
        setShowModal(false);
        fetchData();
        return;
      } catch (error) {
        console.warn('Fallo servidor al guardar incidente, se cambiará a guardado offline:', error);
      }
    }

    // Modo Offline
    addToOfflineQueue({
      type: 'REGISTRAR_INCIDENTE',
      data: formData
    });

    const bioObj = biologicos.find(b => String(b.id) === String(formData.biologico_id));
    const nuevoIncidenteLocal = {
      id: `temp_inc_${Date.now()}`,
      ...formData,
      biologico_nombre: bioObj?.nombre || 'Vacuna',
      isOfflinePending: true,
      estado: 'Activo'
    };

    const incidentesActualizados = [nuevoIncidenteLocal, ...incidentes];
    setIncidentes(incidentesActualizados);
    saveCache('siv_cache_incidentes', incidentesActualizados);

    setShowModal(false);
    showToast('Reporte de incidente guardado localmente en MODO OFFLINE.', 'offline', '⚡ Incidente Offline');
  };

  const handleResolverIncidente = async (id) => {
    if (navigator.onLine && typeof id === 'number') {
      try {
        await axios.put(`${API_URL}/api/incidente_dosis/${id}`, {
          estado: 'Inactivo'
        });
        showToast('Incidente marcado como atendido y resuelto.', 'success', '¡Incidente Atendido!');
        fetchData();
        return;
      } catch (error) {
        console.warn('Error en servidor al resolver incidente');
      }
    }

    const actualizados = incidentes.map(i => i.id === id ? { ...i, estado: 'Inactivo' } : i);
    setIncidentes(actualizados);
    saveCache('siv_cache_incidentes', actualizados);
    showToast('Marcado como resuelto en caché local.', 'info', 'Atendido Offline');
  };

  const getBiologicoNombre = (id) => biologicos.find(b => String(b.id) === String(id))?.nombre || id;
  const getPuestoNombre = (id) => puestos.find(p => String(p.id) === String(id))?.nombre || id;

  const totalDosisPerdidas = incidentes.reduce((acc, curr) => acc + (parseInt(curr.cantidad_afectada) || 0), 0);
  const incidentesCadenaFrio = incidentes.filter(i => i.tipo_incidente?.includes('Cadena de Frío')).length;

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando reportes de incidentes...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {isOffline && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#92400e' }}>
          <WifiOff size={18} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Operando en modo offline. Los nuevos incidentes quedarán en la cola de sincronización.</span>
        </div>
      )}

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={28} color="#dc2626" /> Reporte de Dosis Dañadas e Incidentes
          </h1>
          <p className="text-text-muted" style={{ fontSize: '0.9rem' }}>
            Registro de mermas, vencimientos, rupturas de cadena de frío y frascos descartados.
          </p>
        </div>

        <button onClick={handleOpenModal} className="btn btn-primary" style={{ background: 'linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)', borderColor: '#dc2626' }}>
          <Plus size={18} /> Reportar Incidente / Merma
        </button>
      </div>

      {/* METRICAS KPI DE INCIDENTES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.2rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Dosis Afectadas</span>
          <h2 style={{ margin: '0.4rem 0 0', fontSize: '2rem', color: '#dc2626' }}>{totalDosisPerdidas}</h2>
        </div>
        <div className="glass-panel" style={{ padding: '1.2rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Incidentes Cadena de Frío</span>
          <h2 style={{ margin: '0.4rem 0 0', fontSize: '2rem', color: '#d97706' }}>{incidentesCadenaFrio}</h2>
        </div>
        <div className="glass-panel" style={{ padding: '1.2rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Reportes Registrados</span>
          <h2 style={{ margin: '0.4rem 0 0', fontSize: '2rem', color: '#0f172a' }}>{incidentes.length}</h2>
        </div>
      </div>

      {/* TABLA DE INCIDENTES */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Vacuna</th>
              <th>Lote</th>
              <th>Puesto de Salud</th>
              <th>Tipo de Incidente</th>
              <th>Cantidad</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {incidentes.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No hay reportes de dosis dañadas registrados.
                </td>
              </tr>
            ) : (
              incidentes.map((inc) => (
                <tr key={inc.id}>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>{inc.biologico_nombre || getBiologicoNombre(inc.biologico_id)}</td>
                  <td><span className="badge badge-primary">{inc.lote || 'N/A'}</span></td>
                  <td>{inc.puesto_nombre || getPuestoNombre(inc.puesto_id)}</td>
                  <td>{inc.tipo_incidente}</td>
                  <td><strong style={{ color: '#dc2626' }}>{inc.cantidad_afectada} dosis</strong></td>
                  <td>{inc.fecha_incidente ? inc.fecha_incidente.split('T')[0] : 'N/A'}</td>
                  <td>
                    {inc.estado === 'Inactivo' ? (
                      <span className="badge badge-success">Resuelto</span>
                    ) : inc.isOfflinePending ? (
                      <span className="badge badge-warning">Guardado Offline</span>
                    ) : (
                      <span className="badge badge-danger">Activo / Pendiente</span>
                    )}
                  </td>
                  <td>
                    {inc.estado !== 'Inactivo' && (
                      <button
                        onClick={() => handleResolverIncidente(inc.id)}
                        className="btn"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Atender
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL PARA REPORTAR INCIDENTE */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '520px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ background: '#dc2626', color: '#ffffff', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertTriangle size={20} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>Nuevo Reporte de Incidente</h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#ffffff' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.4rem' }}>
              <div className="input-group">
                <label>Vacuna Afectada</label>
                <select className="input-field" name="biologico_id" value={formData.biologico_id} onChange={handleChange} required>
                  {biologicos.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre} ({b.codigo})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Código de Lote</label>
                  <input type="text" className="input-field" name="lote" required value={formData.lote} onChange={handleChange} placeholder="Ej: LOT-2026-X" />
                </div>
                <div className="input-group">
                  <label>Cantidad de Dosis Afectadas</label>
                  <input type="number" min="1" className="input-field" name="cantidad_afectada" required value={formData.cantidad_afectada} onChange={handleChange} />
                </div>
              </div>

              <div className="input-group">
                <label>Tipo de Incidente</label>
                <select className="input-field" name="tipo_incidente" value={formData.tipo_incidente} onChange={handleChange}>
                  <option value="Ruptura de Cadena de Frío">Ruptura de Cadena de Frío</option>
                  <option value="Vencimiento de Lote">Vencimiento de Lote</option>
                  <option value="Frasco Quebrado / Daño Físico">Frasco Quebrado / Daño Físico</option>
                  <option value="Frasco Abierto No Utilizado">Frasco Abierto No Utilizado</option>
                </select>
              </div>

              <div className="input-group">
                <label>Descripción / Observaciones</label>
                <textarea className="input-field" name="descripcion" rows="3" value={formData.descripcion} onChange={handleChange} placeholder="Detalle las causas del incidente..." />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.2rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn">Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#dc2626', borderColor: '#dc2626' }}>
                  {isOffline ? 'Guardar Offline' : 'Enviar Reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default IncidentesVacunas;
