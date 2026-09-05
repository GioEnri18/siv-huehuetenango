import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { 
  PackageMinus, Search, Truck, AlertTriangle, ArrowRightLeft, 
  Building, RefreshCw, FileText, CheckCircle2, ShieldAlert, Filter, Layers, Lock, AlertCircle, Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const SalidaVacunas = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tabActiva, setTabActiva] = useState('salidas'); // 'salidas' | 'incidentes'
  const [salidas, setSalidas] = useState([]);
  const [incidentesPendientes, setIncidentesPendientes] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // Formulario y Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState(null);

  const [formData, setFormData] = useState({
    modo_salida: 'manual', // 'manual' | 'incidente'
    incidente_id: '',
    lote_id: '',
    cantidad_dosis: '',
    tipo_salida: 'Traslado',
    puesto_destino_id: '',
    motivo_detalle: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSalidas, resInc, resLotes, resPuestos] = await Promise.all([
        axios.get(`${API_URL}/api/inventario/salidas`),
        axios.get(`${API_URL}/api/inventario/incidentes-pendientes`),
        axios.get(`${API_URL}/api/inventario/lotes?solo_activos=true`),
        axios.get(`${API_URL}/api/puesto_salud`)
      ]);

      setSalidas(resSalidas.data || []);
      setIncidentesPendientes(resInc.data || []);
      setLotes(resLotes.data || []);
      setPuestos(resPues.data || []);
    } catch (error) {
      console.error('Error al cargar salidas e inventario:', error);
      showToast('Error al consultar el inventario de salidas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLoteChange = (e) => {
    const loteId = e.target.value;
    const loteObj = lotes.find(l => String(l.id) === String(loteId));
    setLoteSeleccionado(loteObj || null);
    setFormData(prev => ({
      ...prev,
      lote_id: loteId
    }));
  };

  const handleIncidenteSelectModal = (e) => {
    const incId = e.target.value;
    const incObj = incidentesPendientes.find(i => String(i.id) === String(incId));
    setIncidenteSeleccionado(incObj || null);

    if (incObj) {
      // Buscar lote coincidente si existe
      const loteCoincidente = lotes.find(l => l.codigo_lote?.trim() === incObj.codigo_lote?.trim() && String(l.biologico_id) === String(incObj.biologico_id));
      setLoteSeleccionado(loteCoincidente || null);

      setFormData(prev => ({
        ...prev,
        incidente_id: incId,
        lote_id: loteCoincidente ? loteCoincidente.id : '',
        cantidad_dosis: incObj.cantidad_afectada,
        tipo_salida: incObj.tipo_incidente,
        motivo_detalle: incObj.descripcion || `Salida registrada por reporte de vacuna dañada #${incObj.id}`
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        incidente_id: '',
        lote_id: '',
        cantidad_dosis: '',
        tipo_salida: 'Descarte/Dañada',
        motivo_detalle: ''
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 1-Click Procesar Salida Directa desde la Tabla de Incidentes Dañados
  const handleProcesarIncidenteDirecto = async (incidente) => {
    if (!window.confirm(`¿Confirmas dar salida de inventario a ${incidente.cantidad_afectada} dosis de ${incidente.biologico_nombre} (Lote: ${incidente.codigo_lote}) por motivo de '${incidente.tipo_incidente}'?`)) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/inventario/salidas/procesar-incidente/${incidente.id}`);
      showToast(`¡Salida procesada con éxito! Se descontaron ${incidente.cantidad_afectada} dosis del lote ${incidente.codigo_lote}.`, 'success');
      fetchData();
    } catch (error) {
      console.error('Error al procesar salida por incidente:', error);
      showToast(error.response?.data?.mensaje || 'Error al procesar la salida por reporte de vacuna dañada', 'error');
      setLoading(false);
    }
  };

  const handleSubmitSalida = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (formData.modo_salida === 'incidente' && formData.incidente_id) {
        // Procesar salida por incidente de vacuna dañada
        await axios.post(`${API_URL}/api/inventario/salidas/procesar-incidente/${formData.incidente_id}`);
        showToast('¡Salida por reporte de vacuna dañada procesada y descontada del inventario!', 'success');
      } else {
        // Procesar salida manual (traslado, merma o descarte)
        if (!formData.lote_id || !formData.cantidad_dosis || !formData.tipo_salida) {
          showToast('Por favor completa los campos obligatorios marcados con (*)', 'warning');
          setSubmitting(false);
          return;
        }

        const numDosis = parseInt(formData.cantidad_dosis, 10);
        if (loteSeleccionado && numDosis > loteSeleccionado.dosis_disponibles) {
          showToast(`La cantidad a dar salida (${numDosis}) supera el stock disponible (${loteSeleccionado.dosis_disponibles})`, 'error');
          setSubmitting(false);
          return;
        }

        if (formData.tipo_salida === 'Traslado' && !formData.puesto_destino_id) {
          showToast('Debes seleccionar el Puesto de Salud de Destino para traslados', 'warning');
          setSubmitting(false);
          return;
        }

        await axios.post(`${API_URL}/api/inventario/salidas`, {
          ...formData,
          cantidad_dosis: numDosis,
          biologico_id: loteSeleccionado?.biologico_id,
          codigo_lote: loteSeleccionado?.codigo_lote
        });

        showToast('¡Salida de vacuna registrada exitosamente!', 'success');
      }

      setShowModal(false);
      setFormData({
        modo_salida: 'manual',
        incidente_id: '',
        lote_id: '',
        cantidad_dosis: '',
        tipo_salida: 'Traslado',
        puesto_destino_id: '',
        motivo_detalle: ''
      });
      setLoteSeleccionado(null);
      setIncidenteSeleccionado(null);

      fetchData();
    } catch (error) {
      console.error('Error al registrar salida:', error);
      showToast(error.response?.data?.mensaje || 'Error al procesar la salida de vacunas', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrado de salidas
  const salidasFiltradas = salidas.filter(item => {
    const cumpleBusqueda = !busqueda || 
      item.numero_comprobante?.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.codigo_lote?.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.biologico_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.motivo_detalle?.toLowerCase().includes(busqueda.toLowerCase());

    const cumpleTipo = !filtroTipo || item.tipo_salida === filtroTipo;

    return cumpleBusqueda && cumpleTipo;
  });

  const totalSalidas = salidas.length;
  const totalDosisEgresadas = salidas.reduce((acc, curr) => acc + (parseInt(curr.cantidad_dosis, 10) || 0), 0);
  const totalIncidentesPendientes = incidentesPendientes.length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* ENCABEZADO */}
      <div className="glass-panel" style={{ padding: '1.5rem 1.8rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div style={{ background: '#fef3c7', color: '#d97706', padding: '0.65rem', borderRadius: '12px', display: 'flex' }}>
              <PackageMinus size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                Salida y Egreso de Vacunas
              </h1>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', fontWeight: 500 }}>
                Control logístico de traslados a puestos de salud y egresos por reporte de vacunas dañadas o mermas.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn"
          style={{ padding: '0.7rem 1.3rem', fontSize: '0.9rem', borderRadius: '10px', background: 'linear-gradient(180deg, #d97706 0%, #b45309 100%)', color: '#ffffff', border: '1px solid #d97706', fontWeight: 700 }}
        >
          <PackageMinus size={18} />
          <span>Registrar Salida de Inventario</span>
        </button>
      </div>

      {/* TARJETAS DE ESTADÍSTICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#fef3c7', color: '#d97706', padding: '0.85rem', borderRadius: '12px', display: 'flex' }}>
            <PackageMinus size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Total Egresos</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{totalSalidas}</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.85rem', borderRadius: '12px', display: 'flex' }}>
            <Truck size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Dosis Egresadas</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626' }}>{totalDosisEgresadas.toLocaleString('es-GT')} dosis</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: totalIncidentesPendientes > 0 ? '#fff7ed' : '#ffffff', borderColor: totalIncidentesPendientes > 0 ? '#fdba74' : '#e2e8f0' }}>
          <div style={{ background: '#ffedd5', color: '#ea580c', padding: '0.85rem', borderRadius: '12px', display: 'flex' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Vacunas Dañadas Pendientes</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c2410c' }}>{totalIncidentesPendientes} reportes</span>
          </div>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACION (TABS) */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setTabActiva('historial')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            borderBottom: tabActiva === 'historial' ? '3px solid var(--primary)' : '3px solid transparent',
            color: tabActiva === 'historial' ? 'var(--primary)' : '#64748b',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FileText size={18} /> Historial de Salidas Registradas
        </button>

        <button
          onClick={() => setTabActiva('incidentes')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            borderBottom: tabActiva === 'incidentes' ? '3px solid #ea580c' : '3px solid transparent',
            color: tabActiva === 'incidentes' ? '#ea580c' : '#64748b',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <AlertTriangle size={18} /> Incidentes por Procesar
          {totalIncidentesPendientes > 0 && (
            <span style={{ background: '#ea580c', color: '#ffffff', fontSize: '0.72rem', padding: '0.1rem 0.5rem', borderRadius: '10px' }}>
              {totalIncidentesPendientes}
            </span>
          )}
        </button>
      </div>

      {/* VISTA TAB 1: HISTORIAL DE SALIDAS REGISTRADAS */}
      {tabActiva === 'historial' && (
        <>
          {/* FILTROS DE HISTORIAL */}
          <div className="glass-panel mb-4" style={{ padding: '1.2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Buscar por N° Comprobante, Lote o Detalle..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '2.4rem', marginBottom: 0 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="input-field"
                style={{ minWidth: '200px', marginBottom: 0 }}
              >
                <option value="">Todos los Motivos</option>
                <option value="Traslado">Traslado</option>
                <option value="Vencimiento">Vencimiento</option>
                <option value="Ruptura Cadena Frío">Ruptura Cadena Frío</option>
                <option value="Ajuste de Inventario">Ajuste de Inventario</option>
                <option value="Descarte/Dañada">Descarte/Dañada</option>
              </select>
            </div>
          </div>

          {/* TABLA HISTORIAL DE SALIDAS */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>N° Comprobante</th>
                  <th>Biológico / Vacuna</th>
                  <th>Lote</th>
                  <th>Dosis Egresadas</th>
                  <th>Tipo de Salida</th>
                  <th>Origen / Destino</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto', color: '#d97706' }} />
                      Cargando historial de salidas de vacunas...
                    </td>
                  </tr>
                ) : salidasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      No se encontraron registros de salida con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  salidasFiltradas.map((item) => (
                    <tr key={item.id} style={{ opacity: item.estado === 'Anulado' ? 0.6 : 1 }}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: item.estado === 'Anulado' ? '#94a3b8' : '#d97706' }}>
                        {item.numero_comprobante}
                      </td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>
                        {item.biologico_nombre}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {item.codigo_lote}
                      </td>
                      <td style={{ fontWeight: 800, color: item.estado === 'Anulado' ? '#94a3b8' : '#dc2626' }}>
                        -{item.cantidad_dosis} dosis
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                          <span className={`badge ${
                            item.tipo_salida === 'Traslado' ? 'badge-primary' : item.tipo_salida === 'Vencimiento' ? 'badge-danger' : 'badge-warning'
                          }`}>
                            {item.tipo_salida}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {item.tipo_salida === 'Traslado' && item.puesto_destino_nombre ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#0284c7', fontWeight: 700 }}>
                            <span>{item.puesto_origen_nombre || 'Origen'}</span>
                            <ArrowRightLeft size={12} />
                            <span>{item.puesto_destino_nombre}</span>
                          </span>
                        ) : (
                          item.puesto_origen_nombre || 'Puesto Local'
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(item.fecha_salida).toLocaleDateString('es-GT')}
                      </td>
                      <td>
                        {item.estado === 'Anulado' ? (
                          <span className="badge badge-error">Anulado</span>
                        ) : (
                          <span className="badge badge-success">Completado</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.estado !== 'Anulado' && (
                          <button
                            onClick={() => handleAnularSalida(item.id, item.numero_comprobante)}
                            className="btn"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5', fontWeight: 700 }}
                            title="Anular salida y devolver stock a inventario"
                          >
                            Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* VISTA TAB 2: REPORTES DE VACUNAS DAÑADAS PENDIENTES DE DAR SALIDA */}
      {tabActiva === 'incidentes' && (
        <div className="table-container">
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #fdba74', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff7ed' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} style={{ color: '#ea580c' }} />
              Reportes de Vacunas Dañadas Pendientes de Descontar en Inventario
            </h3>
            <span className="badge badge-warning" style={{ background: '#ffedd5', color: '#ea580c' }}>
              {totalIncidentesPendientes} reportes por procesar
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th>N° Reporte</th>
                <th>Biológico / Vacuna</th>
                <th>Lote Afectado</th>
                <th>Stock Actual en Lote</th>
                <th>Dosis Dañadas</th>
                <th>Tipo de Incidente / Daño</th>
                <th>Fecha Reporte</th>
                <th style={{ textAlign: 'center' }}>Acción de Inventario</th>
              </tr>
            </thead>
            <tbody>
              {incidentesPendientes.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#166534', background: '#f0fdf4' }}>
                    <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem auto', color: '#166534' }} />
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>¡Excelente! No hay reportes de vacunas dañadas pendientes de egreso.</p>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#15803d' }}>Todos los incidentes registrados han sido procesados y descontados del inventario.</p>
                  </td>
                </tr>
              ) : (
                incidentesPendientes.map((inc) => (
                  <tr key={inc.id}>
                    <td style={{ fontWeight: 800, color: '#ea580c' }}>
                      Incidente #{inc.id}
                    </td>
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>
                      {inc.biologico_nombre}
                    </td>
                    <td>
                      <span className="badge badge-warning" style={{ fontFamily: 'monospace' }}>
                        {inc.codigo_lote}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {inc.stock_lote_actual} dosis disponibles
                    </td>
                    <td style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.95rem' }}>
                      -{inc.cantidad_afectada} dosis
                    </td>
                    <td>
                      <span className="badge badge-danger">
                        {inc.tipo_incidente}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {new Date(inc.fecha_incidente || inc.creado_en).toLocaleDateString('es-GT')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleProcesarIncidenteDirecto(inc)}
                        className="btn"
                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5', fontWeight: 700 }}
                      >
                        <Trash2 size={14} />
                        Dar Salida y Descontar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL REGISTRAR NUEVA SALIDA */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#0f172a', padding: '1.2rem 1.5rem', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <PackageMinus size={22} style={{ color: '#fbbf24' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>Registrar Salida / Egreso de Vacunas</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSalida} style={{ padding: '1.5rem' }}>
              {/* OPCIÓN: MODO DE REGISTRO */}
              {totalIncidentesPendientes > 0 && (
                <div style={{ background: '#fff7ed', border: '1px solid #fdba74', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.2rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                    Origen de la Salida de Inventario
                  </label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                      <input
                        type="radio"
                        name="modo_salida"
                        value="manual"
                        checked={formData.modo_salida === 'manual'}
                        onChange={(e) => setFormData(prev => ({ ...prev, modo_salida: e.target.value }))}
                      />
                      Salida Manual / Traslado
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: '#c2410c' }}>
                      <input
                        type="radio"
                        name="modo_salida"
                        value="incidente"
                        checked={formData.modo_salida === 'incidente'}
                        onChange={(e) => setFormData(prev => ({ ...prev, modo_salida: e.target.value }))}
                      />
                      Vincular a Reporte de Vacuna Dañada ({totalIncidentesPendientes})
                    </label>
                  </div>
                </div>
              )}

              {/* SI SE SELECCIONA MODO INCIDENTE */}
              {formData.modo_salida === 'incidente' ? (
                <div className="input-group">
                  <label>Seleccionar Reporte de Vacuna Dañada Pendiente *</label>
                  <select
                    name="incidente_id"
                    value={formData.incidente_id}
                    onChange={handleIncidenteSelectModal}
                    required
                    className="input-field"
                  >
                    <option value="">-- Seleccionar Reporte de Daño --</option>
                    {incidentesPendientes.map(inc => (
                      <option key={inc.id} value={inc.id}>
                        Incidente #{inc.id}: {inc.biologico_nombre} - Lote: {inc.codigo_lote} ({inc.cantidad_afectada} dosis dañadas por {inc.tipo_incidente})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="input-group">
                  <label>Seleccionar Lote de Inventario con Stock Disponible *</label>
                  <select
                    name="lote_id"
                    value={formData.lote_id}
                    onChange={handleLoteChange}
                    required={formData.modo_salida === 'manual'}
                    className="input-field"
                    style={{ fontFamily: 'monospace', fontWeight: 600 }}
                  >
                    <option value="">-- Seleccionar Lote Activo --</option>
                    {lotes.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.biologico_nombre} - Lote: {l.codigo_lote} (Stock: {l.dosis_disponibles} dosis | Vence: {new Date(l.fecha_vencimiento).toLocaleDateString('es-GT')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {loteSeleccionado && (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.85rem', borderRadius: '10px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontWeight: 600 }}>Stock Disponible en Lote:</span>
                    <span style={{ fontWeight: 800, color: '#166534', fontSize: '1rem' }}>{loteSeleccionado.dosis_disponibles} dosis</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#64748b', display: 'block', fontWeight: 600 }}>Vencimiento:</span>
                    <span style={{ fontWeight: 800, color: '#d97706' }}>{new Date(loteSeleccionado.fecha_vencimiento).toLocaleDateString('es-GT')}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="input-group">
                  <label>Tipo / Motivo de Salida *</label>
                  <select
                    name="tipo_salida"
                    value={formData.tipo_salida}
                    onChange={handleChange}
                    required
                    disabled={formData.modo_salida === 'incidente'}
                    className="input-field"
                  >
                    <option value="Traslado">Traslado a Puesto de Salud</option>
                    <option value="Vencimiento">Vencimiento / Caducidad</option>
                    <option value="Ruptura Cadena Frío">Ruptura Cadena de Frío</option>
                    <option value="Ajuste de Inventario">Ajuste de Inventario</option>
                    <option value="Descarte/Dañada">Descarte / Frasco Dañado</option>
                    <option value="Otro">Otro Motivo</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Cantidad de Dosis a Retirar *</label>
                  <input
                    type="number"
                    name="cantidad_dosis"
                    value={formData.cantidad_dosis}
                    onChange={handleChange}
                    required
                    min="1"
                    disabled={formData.modo_salida === 'incidente'}
                    max={loteSeleccionado?.dosis_disponibles || 9999}
                    placeholder="Ej. 15"
                    className="input-field"
                    style={{ fontWeight: 800, color: '#dc2626' }}
                  />
                </div>
              </div>

              {formData.tipo_salida === 'Traslado' && formData.modo_salida === 'manual' && (
                <div className="input-group">
                  <label>Puesto de Salud Destino *</label>
                  <select
                    name="puesto_destino_id"
                    value={formData.puesto_destino_id}
                    onChange={handleChange}
                    required={formData.tipo_salida === 'Traslado'}
                    className="input-field"
                  >
                    <option value="">-- Seleccionar Puesto Destino --</option>
                    {puestos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.municipio})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="input-group">
                <label>Justificación / Detalle de la Salida</label>
                <textarea
                  name="motivo_detalle"
                  value={formData.motivo_detalle}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Describe detalles del traslado, acta de descarte o motivo de ajuste..."
                  className="input-field"
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn"
                  style={{ background: 'linear-gradient(180deg, #d97706 0%, #b45309 100%)', color: '#ffffff', borderColor: '#d97706', fontWeight: 700 }}
                >
                  {submitting ? <RefreshCw size={16} className="animate-spin" /> : <PackageMinus size={16} />}
                  <span>Procesar Salida y Descontar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalidaVacunas;
