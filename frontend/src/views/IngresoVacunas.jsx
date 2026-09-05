import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { 
  PackagePlus, Search, Printer, Syringe, Calendar, Building, FileText, 
  CheckCircle2, RefreshCw, Lock, ShieldCheck, Filter, KeyRound, AlertCircle
} from 'lucide-react';
import TicketIngresoModal from '../components/TicketIngresoModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const IngresoVacunas = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [ingresos, setIngresos] = useState([]);
  const [biologicos, setBiologicos] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros de búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [filtroBiologico, setFiltroBiologico] = useState('');
  const [filtroPuesto, setFiltroPuesto] = useState('');

  // Modales
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Formulario de Ingreso
  const [formData, setFormData] = useState({
    biologico_id: '',
    codigo_lote: '',
    cantidad_dosis: '',
    cantidad_frascos: 10,
    dosis_por_frasco: 10,
    fecha_fabricacion: '',
    fecha_vencimiento: '',
    proveedor_origen: 'Centro de Acopio Central Huehuetenango',
    ubicacion_refrigeracion: 'Refrigerador de Almacén A1 (+2°C a +8°C)',
    documento_referencia: '',
    puesto_id: user?.puesto_id || '',
    observaciones: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resIngresos, resBio, resPues] = await Promise.all([
        axios.get(`${API_URL}/api/inventario/ingresos`),
        axios.get(`${API_URL}/api/biologico`),
        axios.get(`${API_URL}/api/puesto_salud`)
      ]);

      setIngresos(resIngresos.data || []);
      setBiologicos(resBio.data || []);
      setPuestos(resPues.data || []);
    } catch (error) {
      console.error('Error al cargar datos de inventario:', error);
      showToast('Error al cargar el historial de ingresos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Paso 1: Validar campos del formulario y solicitar la clave de autorización
  const handlePasoAutorizacion = (e) => {
    e.preventDefault();
    if (!formData.biologico_id || !formData.codigo_lote || !formData.cantidad_dosis || !formData.fecha_vencimiento) {
      showToast('Por favor completa los campos obligatorios marcados con (*)', 'warning');
      return;
    }

    setAuthPassword('');
    setAuthError('');
    setShowAuthModal(true);
  };

  // Paso 2: Verificar la contraseña de Administrador/Usuario y procesar la creación del ticket
  const handleConfirmarEIngresarTicket = async (e) => {
    e.preventDefault();
    if (!authPassword) {
      setAuthError('Debes ingresar la contraseña de autorización.');
      return;
    }

    setSubmitting(true);
    setAuthError('');

    try {
      // Validar la contraseña contra la API de autenticación con la cuenta activa o de admin
      const usuarioAValidar = user?.usuario || 'admin';
      try {
        await axios.post(`${API_URL}/api/auth/login`, {
          usuario: usuarioAValidar,
          password: authPassword
        });
      } catch (loginErr) {
        // Intentar también validar con cuenta 'admin' por si usa la contraseña maestra del sistema
        try {
          await axios.post(`${API_URL}/api/auth/login`, {
            usuario: 'admin',
            password: authPassword
          });
        } catch (adminErr) {
          setAuthError('Contraseña de autorización incorrecta. Inténtalo de nuevo.');
          setSubmitting(false);
          return;
        }
      }

      // Si la clave fue válida, procesar el ingreso de la vacuna
      const response = await axios.post(`${API_URL}/api/inventario/ingresos`, {
        ...formData,
        cantidad_dosis: parseInt(formData.cantidad_dosis, 10),
        cantidad_frascos: parseInt(formData.cantidad_frascos, 10) || 1,
        dosis_por_frasco: parseInt(formData.dosis_por_frasco, 10) || 1,
        puesto_id: formData.puesto_id || user?.puesto_id || 1
      });

      showToast('¡Autorización concedida! Ingreso de vacuna registrado exitosamente.', 'success');
      setShowAuthModal(false);
      setShowFormModal(false);

      // Abrir inmediatamente el modal del Ticket para visualización e impresión
      if (response.data.ticket) {
        setTicketSeleccionado(response.data.ticket);
        setShowTicketModal(true);
      }

      // Reiniciar formulario
      setFormData({
        biologico_id: '',
        codigo_lote: '',
        cantidad_dosis: '',
        cantidad_frascos: 10,
        dosis_por_frasco: 10,
        fecha_fabricacion: '',
        fecha_vencimiento: '',
        proveedor_origen: 'Centro de Acopio Central Huehuetenango',
        ubicacion_refrigeracion: 'Refrigerador de Almacén A1 (+2°C a +8°C)',
        documento_referencia: '',
        puesto_id: user?.puesto_id || '',
        observaciones: ''
      });

      fetchData();
    } catch (error) {
      console.error('Error al registrar ingreso:', error);
      showToast(error.response?.data?.mensaje || 'Error al guardar el ingreso de vacuna', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerTicket = async (ingresoId) => {
    try {
      const response = await axios.get(`${API_URL}/api/inventario/ingresos/${ingresoId}/ticket`);
      setTicketSeleccionado(response.data);
      setShowTicketModal(true);
    } catch (error) {
      console.error('Error al cargar ticket:', error);
      showToast('Error al consultar el ticket de ingreso', 'error');
    }
  };

  // Filtrado de registros
  const ingresosFiltrados = ingresos.filter(item => {
    const cumpleBusqueda = !busqueda || 
      item.numero_ticket?.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.codigo_lote?.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.biologico_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.proveedor_origen?.toLowerCase().includes(busqueda.toLowerCase());

    const cumpleBio = !filtroBiologico || String(item.biologico_id) === String(filtroBiologico);
    const cumplePuesto = !filtroPuesto || String(item.puesto_id) === String(filtroPuesto);

    return cumpleBusqueda && cumpleBio && cumplePuesto;
  });

  const totalIngresos = ingresos.length;
  const totalDosisIngresadas = ingresos.reduce((acc, curr) => acc + (parseInt(curr.cantidad_dosis, 10) || 0), 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* ENCABEZADO DE LA SECCIÓN */}
      <div className="glass-panel" style={{ padding: '1.5rem 1.8rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '0.65rem', borderRadius: '12px', display: 'flex' }}>
              <PackagePlus size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                Ingreso de Vacunas y Comprobantes
              </h1>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', fontWeight: 500 }}>
                Control de remesas entrantes, lotes biológicos y emisión autorizada de tickets de recepción.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowFormModal(true)}
          className="btn btn-primary"
          style={{ padding: '0.7rem 1.3rem', fontSize: '0.9rem', borderRadius: '10px' }}
        >
          <PackagePlus size={18} />
          <span>Registrar Nuevo Ingreso</span>
        </button>
      </div>

      {/* TARJETAS DE ESTADÍSTICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '0.85rem', borderRadius: '12px', display: 'flex' }}>
            <PackagePlus size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Total Ingresos</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{totalIngresos}</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#dcfce7', color: '#166534', padding: '0.85rem', borderRadius: '12px', display: 'flex' }}>
            <Syringe size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Dosis Recibidas</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#166534' }}>{totalDosisIngresadas.toLocaleString('es-GT')} dosis</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#f3e8ff', color: '#7e22ce', padding: '0.85rem', borderRadius: '12px', display: 'flex' }}>
            <Printer size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Tickets Emitidos</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7e22ce' }}>{totalIngresos} tickets</span>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por Ticket N°, Lote, Vacuna o Proveedor..."
            className="input-field"
            style={{ width: '100%', paddingLeft: '2.4rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={filtroBiologico}
            onChange={(e) => setFiltroBiologico(e.target.value)}
            className="input-field"
            style={{ minWidth: '160px' }}
          >
            <option value="">Todas las Vacunas</option>
            {biologicos.map(b => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>

          <select
            value={filtroPuesto}
            onChange={(e) => setFiltroPuesto(e.target.value)}
            className="input-field"
            style={{ minWidth: '180px' }}
          >
            <option value="">Todos los Puestos</option>
            {puestos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>

          <button
            onClick={fetchData}
            className="btn"
            style={{ padding: '0.65rem', borderRadius: '8px' }}
            title="Actualizar datos"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* TABLA DE COMPROBANTES DE INGRESO */}
      <div className="table-container">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} style={{ color: '#0284c7' }} />
            Historial de Comprobantes de Ingreso
          </h3>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>
            Mostrando {ingresosFiltrados.length} registros
          </span>
        </div>

        <table>
          <thead>
            <tr>
              <th>N° Ticket / Folio</th>
              <th>Biológico / Vacuna</th>
              <th>Lote</th>
              <th>Dosis Ingresadas</th>
              <th>Fecha Ingreso</th>
              <th>Vencimiento</th>
              <th>Puesto Receptor</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto', color: '#0284c7' }} />
                  Cargando historial de ingresos de vacunas...
                </td>
              </tr>
            ) : ingresosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                  No se encontraron comprobantes de ingreso con los filtros aplicados.
                </td>
              </tr>
            ) : (
              ingresosFiltrados.map((item) => (
                <tr key={item.id} style={{ opacity: item.estado === 'Anulado' ? 0.6 : 1 }}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 800, color: item.estado === 'Anulado' ? '#94a3b8' : '#0284c7' }}>
                    {item.numero_ticket}
                  </td>
                  <td style={{ fontWeight: 800, color: '#0f172a' }}>
                    {item.biologico_nombre}
                  </td>
                  <td>
                    <span className="badge badge-warning" style={{ fontFamily: 'monospace' }}>
                      {item.codigo_lote}
                    </span>
                  </td>
                  <td style={{ fontWeight: 800, color: item.estado === 'Anulado' ? '#94a3b8' : '#166534' }}>
                    +{item.cantidad_dosis} dosis
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {new Date(item.fecha_ingreso).toLocaleDateString('es-GT')}
                  </td>
                  <td style={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}>
                    {new Date(item.fecha_vencimiento).toLocaleDateString('es-GT')}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {item.puesto_nombre || 'Sede Central'}
                  </td>
                  <td style={{ textAlign: 'center', display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleVerTicket(item.id)}
                      className="btn"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd', fontWeight: 700 }}
                    >
                      <Printer size={14} />
                      Ticket
                    </button>
                    {item.estado !== 'Anulado' && (
                      <button
                        onClick={() => handleAnularTicket(item.id, item.numero_ticket)}
                        className="btn"
                        style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5', fontWeight: 700 }}
                        title="Anular ticket y descontar del inventario"
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

      {/* MODAL 1: FORMULARIO PARA REGISTRAR NUEVO INGRESO */}
      {showFormModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '650px', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#0f172a', padding: '1.2rem 1.5rem', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <PackagePlus size={22} style={{ color: '#38bdf8' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>Paso 1: Datos de Recepción de Vacuna</h3>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                style={{ background: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasoAutorizacion} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                <div className="input-group">
                  <label>Biológico / Vacuna *</label>
                  <select
                    name="biologico_id"
                    value={formData.biologico_id}
                    onChange={handleChange}
                    required
                    className="input-field"
                  >
                    <option value="">-- Seleccionar Vacuna --</option>
                    {biologicos.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Código de Lote *</label>
                  <input
                    type="text"
                    name="codigo_lote"
                    value={formData.codigo_lote}
                    onChange={handleChange}
                    required
                    placeholder="Ej. PENTA-2026-L45"
                    className="input-field"
                    style={{ fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </div>

                <div className="input-group">
                  <label>Total Dosis Ingresadas *</label>
                  <input
                    type="number"
                    name="cantidad_dosis"
                    value={formData.cantidad_dosis}
                    onChange={handleChange}
                    required
                    min="1"
                    placeholder="Ej. 100"
                    className="input-field"
                    style={{ fontWeight: 800, color: '#166534' }}
                  />
                </div>

                <div className="input-group">
                  <label>Fecha de Vencimiento *</label>
                  <input
                    type="date"
                    name="fecha_vencimiento"
                    value={formData.fecha_vencimiento}
                    onChange={handleChange}
                    required
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label>Número de Frascos</label>
                  <input
                    type="number"
                    name="cantidad_frascos"
                    value={formData.cantidad_frascos}
                    onChange={handleChange}
                    min="1"
                    placeholder="Ej. 10"
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label>Dosis por Frasco</label>
                  <input
                    type="number"
                    name="dosis_por_frasco"
                    value={formData.dosis_por_frasco}
                    onChange={handleChange}
                    min="1"
                    placeholder="Ej. 10"
                    className="input-field"
                  />
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Proveedor / Origen</label>
                  <input
                    type="text"
                    name="proveedor_origen"
                    value={formData.proveedor_origen}
                    onChange={handleChange}
                    placeholder="Ej. UNICEF / MSPAS Central"
                    className="input-field"
                  />
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Documento de Referencia (Factura / Remisión)</label>
                  <input
                    type="text"
                    name="documento_referencia"
                    value={formData.documento_referencia}
                    onChange={handleChange}
                    placeholder="Ej. Remisión #MSPAS-9914"
                    className="input-field"
                  />
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Puesto de Salud Receptor</label>
                  <select
                    name="puesto_id"
                    value={formData.puesto_id}
                    onChange={handleChange}
                    className="input-field"
                  >
                    {puestos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.municipio})</option>
                    ))}
                  </select>
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Ubicación de Almacenamiento / Refrigeración</label>
                  <input
                    type="text"
                    name="ubicacion_refrigeracion"
                    value={formData.ubicacion_refrigeracion}
                    onChange={handleChange}
                    placeholder="Ej. Refrigerador Principal B2 (Estante 3)"
                    className="input-field"
                  />
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Observaciones de Recepción</label>
                  <textarea
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleChange}
                    rows="2"
                    placeholder="Indicar condiciones de la cadena de frío, estado del paquete, etc."
                    className="input-field"
                  ></textarea>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="btn"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ gap: '0.5rem' }}
                >
                  <Lock size={16} />
                  <span>Continuar a Autorización</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AUTORIZACIÓN CON CONTRASEÑA DE ADMIN/CONFIRMACIÓN */}
      {showAuthModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '1.25rem 1.5rem', color: '#ffffff', textCenter: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', boxShadow: '0 4px 10px rgba(2,132,199,0.3)' }}>
                <KeyRound size={26} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', textCenter: 'center' }}>
                Autorización de Emisión de Ticket
              </h3>
              <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.78rem', color: '#cbd5e1', textCenter: 'center' }}>
                Confirma la firma digital de recepción e ingreso de biológico
              </p>
            </div>

            <form onSubmit={handleConfirmarEIngresarTicket} style={{ padding: '1.5rem' }}>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '0.85rem', marginBottom: '1.2rem', fontSize: '0.82rem', color: '#0369a1', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                <ShieldCheck size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Para autorizar el ingreso del lote <strong style={{ color: '#0f172a' }}>{formData.codigo_lote}</strong> ({formData.cantidad_dosis} dosis), ingresa tu contraseña de acceso:
                </span>
              </div>

              {authError && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} />
                  <span>{authError}</span>
                </div>
              )}

              <div className="input-group">
                <label style={{ display: 'flex', itemsCenter: 'center', justifyBetween: 'space-between' }}>
                  <span>Contraseña de Confirmación / Admin *</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Cuentas: admin (admin123) / usuario activo</span>
                </label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña..."
                  required
                  autoFocus
                  className="input-field"
                  style={{ fontSize: '1rem', padding: '0.75rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="btn"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: '0.7rem 1.4rem' }}
                >
                  {submitting ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Printer size={16} />
                      <span>Autorizar y Emitir Ticket</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VISUALIZACIÓN E IMPRESIÓN DEL TICKET OFICIAL */}
      {showTicketModal && (
        <TicketIngresoModal
          ticket={ticketSeleccionado}
          onClose={() => setShowTicketModal(false)}
        />
      )}
    </div>
  );
};

export default IngresoVacunas;
