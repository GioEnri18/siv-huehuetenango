import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { 
  Search, FilePlus, ShieldPlus, User, Printer, HeartHandshake, MapPin, 
  Calendar, CheckCircle2, Baby, ChevronRight, Clock, ListChecks, WifiOff 
} from 'lucide-react';
import { saveCache, getCache, addToOfflineQueue, CACHE_KEYS } from '../utils/offlineManager';
import { useToast } from '../components/Toast';

const RegistroNominal = () => {
  const { showToast } = useToast();
  const [pacientesLista, setPacientesLista] = useState([]);
  const [tutoresLista, setTutoresLista] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [biologicos, setBiologicos] = useState([]);
  const [esquemaBase, setEsquemaBase] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);

  // Estado del paciente seleccionado
  const [paciente, setPaciente] = useState(null);
  const [tutorInfo, setTutorInfo] = useState(null);
  const [dosisAplicadas, setDosisAplicadas] = useState([]);
  const [pepsSugerencia, setPepsSugerencia] = useState(null);

  // Pestañas de la Ficha del Paciente: 'esquema' | 'historial'
  const [activeTab, setActiveTab] = useState('esquema');

  // Buscador como filtro en tiempo real
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [showDosisModal, setShowDosisModal] = useState(false);
  const [showCarneModal, setShowCarneModal] = useState(false);

  const [nuevoPaciente, setNuevoPaciente] = useState({
    cui: '',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    genero: 'M',
    comunidad: '',
    puesto_id: '',
    tutor_nombre: '',
    tutor_parentesco: 'Madre',
    tutor_telefono: ''
  });

  const [nuevaDosis, setNuevaDosis] = useState({
    biologico_id: '',
    numero_dosis: 1,
    fecha_aplicacion: new Date().toISOString().split('T')[0],
    lote: ''
  });

  // Detectar cambios en conectividad de red
  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cargarDatosGeneral = async () => {
    setLoading(true);
    try {
      if (navigator.onLine) {
        const [resNinos, resTutores, resPues, resBio, resEsq, resLotes] = await Promise.all([
          axios.get(`${API_URL}/api/nino`),
          axios.get(`${API_URL}/api/tutor`),
          axios.get(`${API_URL}/api/puesto_salud`),
          axios.get(`${API_URL}/api/biologico`),
          axios.get(`${API_URL}/api/esquema_dosis`),
          axios.get(`${API_URL}/api/lote_inventario`).catch(() => ({ data: [] }))
        ]);
        
        setPacientesLista(resNinos.data);
        setTutoresLista(resTutores.data);
        setPuestos(resPues.data);
        setBiologicos(resBio.data);
        setEsquemaBase(resEsq.data);

        // Guardar en Caché para Uso Offline
        saveCache(CACHE_KEYS.NINOS, resNinos.data);
        saveCache(CACHE_KEYS.TUTORES, resTutores.data);
        saveCache(CACHE_KEYS.PUESTOS, resPues.data);
        saveCache(CACHE_KEYS.BIOLOGICOS, resBio.data);
        saveCache(CACHE_KEYS.ESQUEMA, resEsq.data);
        if (resLotes && resLotes.data) {
          saveCache(CACHE_KEYS.LOTES, resLotes.data);
        }
        setIsOfflineMode(false);
      } else {
        throw new Error('Modo fuera de línea forzado');
      }
    } catch (error) {
      console.warn('Cargando catálogos desde Caché Local (Modo Offline o Servidor Inaccesible):', error.message);
      setIsOfflineMode(true);
      setPacientesLista(getCache(CACHE_KEYS.NINOS, []));
      setTutoresLista(getCache(CACHE_KEYS.TUTORES, []));
      setPuestos(getCache(CACHE_KEYS.PUESTOS, []));
      setBiologicos(getCache(CACHE_KEYS.BIOLOGICOS, []));
      setEsquemaBase(getCache(CACHE_KEYS.ESQUEMA, []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosGeneral();
  }, []);

  const seleccionarPaciente = (p) => {
    setPaciente(p);
    cargarDosis(p.id);
    if (p.tutor_id) {
      const tut = tutoresLista.find(t => String(t.id) === String(p.tutor_id));
      setTutorInfo(tut || null);
    } else {
      setTutorInfo(null);
    }
  };

  const cargarDosis = async (ninoId) => {
    if (!ninoId) return;
    
    // Obtener dosis previamente guardadas en caché local para este niño (si las hay)
    const cacheDosisKey = `siv_cache_dosis_${ninoId}`;
    const dosisLocales = getCache(cacheDosisKey, []);

    if (navigator.onLine && typeof ninoId === 'number') {
      try {
        const res = await axios.get(`${API_URL}/api/dosis/nino/${ninoId}`);
        // Combinar dosis de servidor con dosis locales pendientes sin duplicar
        const unicas = [...res.data];
        dosisLocales.forEach(dl => {
          if (!unicas.some(u => u.biologico_id === dl.biologico_id && u.numero_dosis === dl.numero_dosis)) {
            unicas.push(dl);
          }
        });
        setDosisAplicadas(unicas);
        saveCache(cacheDosisKey, unicas);
        return;
      } catch (error) {
        console.warn('Error servidor al cargar dosis, se usarán dosis locales:', error);
      }
    }
    
    setDosisAplicadas(dosisLocales);
  };

  const handleAbrirModalDosis = (biologicoIdEspecifico = null, numeroDosisEspecifica = 1) => {
    const bioId = biologicoIdEspecifico || biologicos[0]?.id || '';
    setNuevaDosis({
      biologico_id: bioId,
      numero_dosis: numeroDosisEspecifica,
      fecha_aplicacion: new Date().toISOString().split('T')[0],
      lote: ''
    });
    setPepsSugerencia(null);
    setShowDosisModal(true);

    if (bioId) {
      handleBiologicoChange(bioId);
    }
  };

  const handleBiologicoChange = async (biologicoId) => {
    setNuevaDosis(prev => ({ ...prev, biologico_id: biologicoId, lote: '' }));
    setPepsSugerencia(null);
    if (!biologicoId) return;

    if (navigator.onLine) {
      try {
        const res = await axios.get(`${API_URL}/api/inventario/peps/${biologicoId}?puesto_id=${paciente?.puesto_id || ''}`);
        if (res.data && res.data.codigo_lote) {
          setPepsSugerencia(res.data);
          setNuevaDosis(prev => ({ ...prev, biologico_id: biologicoId, lote: res.data.codigo_lote }));
          return;
        }
      } catch (e) {
        console.log('No hay lote PEPS en servidor, probando sugerencia en caché local...');
      }
    }

    // --- MODO OFFLINE: SUGERENCIA DE LOTE PEPS DESDE CACHE ---
    const lotesCache = getCache(CACHE_KEYS.LOTES, []);
    const lotesVacuna = lotesCache.filter(l => 
      String(l.biologico_id) === String(biologicoId) && 
      (l.estado === 'Activo' || !l.estado)
    );

    // Ordenar PEPS (Primeras en Vencer)
    lotesVacuna.sort((a, b) => new Date(a.fecha_vencimiento || '2099-12-31') - new Date(b.fecha_vencimiento || '2099-12-31'));

    if (lotesVacuna.length > 0) {
      const loteSugerido = lotesVacuna[0];
      const codigoLote = loteSugerido.codigo_lote || loteSugerido.lote || `LOT-${biologicoId}-OFFLINE`;
      setPepsSugerencia({
        codigo_lote: codigoLote,
        fecha_vencimiento: loteSugerido.fecha_vencimiento ? loteSugerido.fecha_vencimiento.split('T')[0] : 'Vencimiento en catálogo',
        isOfflineCache: true
      });
      setNuevaDosis(prev => ({ ...prev, biologico_id: biologicoId, lote: codigoLote }));
    } else {
      // Si no existe lote precargado para esta vacuna específica, generar lote sugerido según el código de la vacuna
      const bioObj = biologicos.find(b => String(b.id) === String(biologicoId));
      const sigla = bioObj?.nombre ? bioObj.nombre.replace(/[^a-zA-Z]/g, '').substr(0, 4).toUpperCase() : 'VAC';
      const codigoSugerido = `LOT-2026-${sigla}`;
      setPepsSugerencia({
        codigo_lote: codigoSugerido,
        fecha_vencimiento: 'Sugerido en Campo',
        isOfflineCache: true
      });
      setNuevaDosis(prev => ({ ...prev, biologico_id: biologicoId, lote: codigoSugerido }));
    }
  };

  const handleCrearPaciente = async (e) => {
    e.preventDefault();
    const tempTutorId = `temp_tutor_${Date.now()}`;
    const tempNinoId = `temp_nino_${Date.now()}`;

    let nuevoTutorObj = null;

    if (nuevoPaciente.tutor_nombre) {
      nuevoTutorObj = {
        id: tempTutorId,
        nombre: nuevoPaciente.tutor_nombre,
        parentesco: nuevoPaciente.tutor_parentesco,
        telefono: nuevoPaciente.tutor_telefono
      };
    }

    const nuevoNinoObj = {
      id: tempNinoId,
      cui: nuevoPaciente.cui,
      nombres: nuevoPaciente.nombres,
      apellidos: nuevoPaciente.apellidos,
      fecha_nacimiento: nuevoPaciente.fecha_nacimiento,
      genero: nuevoPaciente.genero || 'M',
      comunidad: nuevoPaciente.comunidad,
      puesto_id: nuevoPaciente.puesto_id || puestos[0]?.id || 1,
      tutor_id: nuevoTutorObj ? tempTutorId : null,
      isOfflinePending: true
    };

    if (navigator.onLine) {
      try {
        let realTutorId = null;
        if (nuevoPaciente.tutor_nombre) {
          const resTutor = await axios.post(`${API_URL}/api/tutor`, {
            nombre: nuevoPaciente.tutor_nombre,
            parentesco: nuevoPaciente.tutor_parentesco,
            telefono: nuevoPaciente.tutor_telefono
          });
          realTutorId = resTutor.data.id;
        }

        const resNino = await axios.post(`${API_URL}/api/nino`, {
          cui: nuevoPaciente.cui,
          nombres: nuevoPaciente.nombres,
          apellidos: nuevoPaciente.apellidos,
          fecha_nacimiento: nuevoPaciente.fecha_nacimiento,
          genero: nuevoPaciente.genero || 'M',
          comunidad: nuevoPaciente.comunidad,
          puesto_id: nuevoPaciente.puesto_id || puestos[0]?.id || 1,
          tutor_id: realTutorId
        });

        setShowNuevoModal(false);
        await cargarDatosGeneral();
        seleccionarPaciente(resNino.data);
        showToast('Paciente y Tutor registrados e integrados exitosamente en el servidor.', 'success', '¡Paciente Creado!');
        return;
      } catch (error) {
        console.warn('Fallo al registrar en servidor, cambiando a guardado offline:', error);
      }
    }

    // --- MODO OFFLINE / FALLBACK ---
    if (nuevoTutorObj) {
      addToOfflineQueue({
        type: 'CREAR_TUTOR',
        tempId: tempTutorId,
        data: {
          nombre: nuevoTutorObj.nombre,
          parentesco: nuevoTutorObj.parentesco,
          telefono: nuevoTutorObj.telefono
        }
      });
      setTutoresLista(prev => [nuevoTutorObj, ...prev]);
    }

    addToOfflineQueue({
      type: 'CREAR_NINO',
      tempId: tempNinoId,
      data: {
        cui: nuevoNinoObj.cui,
        nombres: nuevoNinoObj.nombres,
        apellidos: nuevoNinoObj.apellidos,
        fecha_nacimiento: nuevoNinoObj.fecha_nacimiento,
        genero: nuevoNinoObj.genero,
        comunidad: nuevoNinoObj.comunidad,
        puesto_id: nuevoNinoObj.puesto_id,
        tutor_id: tempTutorId
      }
    });

    const listaActualizada = [nuevoNinoObj, ...pacientesLista];
    setPacientesLista(listaActualizada);
    saveCache(CACHE_KEYS.NINOS, listaActualizada);

    setShowNuevoModal(false);
    seleccionarPaciente(nuevoNinoObj);
    showToast('Paciente guardado localmente en MODO OFFLINE. Se sincronizará al conectar internet.', 'offline', '⚡ Guardado Offline');
  };

  const handleRegistrarDosis = async (e) => {
    e.preventDefault();

    const dosisPayload = {
      nino_id: paciente.id,
      biologico_id: nuevaDosis.biologico_id,
      numero_dosis: nuevaDosis.numero_dosis,
      fecha_aplicacion: nuevaDosis.fecha_aplicacion,
      lote: nuevaDosis.lote || 'LOT-OFFLINE',
      puesto_id: paciente.puesto_id || 1,
      sincronizado: false
    };

    if (navigator.onLine && typeof paciente.id === 'number') {
      try {
        await axios.post(`${API_URL}/api/dosis/registrar`, dosisPayload);
        setShowDosisModal(false);
        cargarDosis(paciente.id);
        showToast('Inmunización registrada e integrada al carné correctamente.', 'success', '¡Vacuna Aplicada!');
        return;
      } catch (error) {
        console.warn('Error en servidor al registrar dosis, se agregará a la cola offline:', error);
      }
    }

    // --- MODO OFFLINE ---
    addToOfflineQueue({
      type: 'REGISTRAR_DOSIS',
      data: dosisPayload
    });

    const bioObj = biologicos.find(b => String(b.id) === String(nuevaDosis.biologico_id));
    const nuevaDosisLocal = {
      id: `temp_dosis_${Date.now()}`,
      ...dosisPayload,
      biologico_nombre: bioObj?.nombre || 'Vacuna',
      isOfflinePending: true
    };

    const dosisNuevas = [...dosisAplicadas, nuevaDosisLocal];
    setDosisAplicadas(dosisNuevas);
    saveCache(`siv_cache_dosis_${paciente.id}`, dosisNuevas);

    setShowDosisModal(false);
    showToast('Vacuna registrada localmente en MODO OFFLINE. Queda guardada en la cola.', 'offline', '⚡ Inmunización Offline');
  };

  const getBiologicoNombre = (id, fallback) => biologicos.find(b => String(b.id) === String(id))?.nombre || fallback || id;

  const handleAnularDosis = async (dosisId) => {
    if (!window.confirm('¿Está seguro de anular la aplicación de esta dosis? Esta acción actualizará el carné vacunal, devolverá la dosis al lote de inventario y recalculará las alertas de rezago.')) return;
    try {
      if (String(dosisId).startsWith('temp_dosis_')) {
        const dosisActualizadas = dosisAplicadas.filter(d => d.id !== dosisId);
        setDosisAplicadas(dosisActualizadas);
        saveCache(`siv_cache_dosis_${paciente.id}`, dosisActualizadas);
        showToast('Registro de dosis local sin sincronizar eliminado', 'success');
        return;
      }

      await axios.put(`${API_URL}/api/dosis/${dosisId}/anular`);
      showToast('¡Dosis anulada con éxito y carné de vacunación actualizado!', 'success');
      cargarDosisPaciente(paciente.id);
    } catch (error) {
      console.error('Error al anular dosis:', error);
      showToast(error.response?.data?.mensaje || 'Error al anular la dosis seleccionada', 'error');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'N';
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
  };

  const parseFechaLocalDate = (fechaIsoOrStr) => {
    if (!fechaIsoOrStr) return null;
    const str = String(fechaIsoOrStr).split('T')[0];
    const parts = str.split('-');
    if (parts.length < 3) return new Date(fechaIsoOrStr);
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  };

  const formatFechaClean = (fechaIsoOrStr) => {
    if (!fechaIsoOrStr) return 'N/A';
    const str = String(fechaIsoOrStr).split('T')[0];
    const parts = str.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return str;
  };

  const calcularEdadDetallada = (fechaNacStr) => {
    if (!fechaNacStr) return 'Recién nacido (0 días)';
    const nac = parseFechaLocalDate(fechaNacStr);
    if (!nac || isNaN(nac.getTime())) return 'N/A';

    const hoy = new Date();
    const hoyMidnight = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const nacMidnight = new Date(nac.getFullYear(), nac.getMonth(), nac.getDate());

    const diffMs = hoyMidnight.getTime() - nacMidnight.getTime();
    if (diffMs <= 0) {
      return 'Recién nacido (0 días)';
    }

    let años = hoyMidnight.getFullYear() - nacMidnight.getFullYear();
    let meses = hoyMidnight.getMonth() - nacMidnight.getMonth();
    let dias = hoyMidnight.getDate() - nacMidnight.getDate();

    if (dias < 0) {
      meses -= 1;
      const ultimoDiaMesAnterior = new Date(hoyMidnight.getFullYear(), hoyMidnight.getMonth(), 0).getDate();
      dias += ultimoDiaMesAnterior;
    }
    if (meses < 0) {
      años -= 1;
      meses += 12;
    }

    if (años < 0) {
      return 'Recién nacido (0 días)';
    }

    let partes = [];
    if (años > 0) partes.push(`${años} ${años === 1 ? 'año' : 'años'}`);
    if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
    if (dias > 0 || partes.length === 0) partes.push(`${dias} ${dias === 1 ? 'día' : 'días'}`);

    return partes.join(', ');
  };

  const pacientesFiltrados = pacientesLista.filter(p => {
    const q = searchTerm.toLowerCase();
    const nombreCompleto = `${p.nombres} ${p.apellidos}`.toLowerCase();
    const cuiStr = p.cui ? String(p.cui) : '';
    return nombreCompleto.includes(q) || cuiStr.includes(q);
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* BANNER INFORMATIVO MODO OFFLINE */}
      {isOfflineMode && (
        <div style={{
          background: 'linear-gradient(90deg, #fef3c7 0%, #fffbeb 100%)',
          border: '1px solid #fde68a',
          borderRadius: '12px',
          padding: '0.85rem 1.2rem',
          marginBottom: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          color: '#92400e'
        }}>
          <WifiOff size={20} color="#b45309" />
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: '0.9rem', display: 'block' }}>
              Modo Fuera de Línea Activo (Caché Local SIV)
            </strong>
            <span style={{ fontSize: '0.82rem' }}>
              Puede consultar expedientes, registrar niños y aplicar vacunas en campo. Todo se guardará de forma segura y se enviará al reconectar.
            </span>
          </div>
          <span className="badge badge-warning">OFFLINE</span>
        </div>
      )}

      {/* CABECERA PRINCIPAL CON BUSCADOR Y BOTON CREAR */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Baby size={28} color="var(--primary)" />
            Registro Nominal de Vacunación
          </h1>
          <p className="text-text-muted" style={{ fontSize: '0.9rem' }}>
            Gestión integral de expedientes infantiles, carné de inmunización y esquema oficial MSPAS.
          </p>
        </div>

        <button 
          onClick={() => setShowNuevoModal(true)} 
          className="btn btn-primary"
          style={{ padding: '0.7rem 1.3rem', borderRadius: '10px', fontSize: '0.92rem', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)' }}
        >
          <FilePlus size={18} /> Nuevo Paciente / Ficha
        </button>
      </div>

      {/* LAYOUT PRINCIPAL: LISTA DE PACIENTES Y FICHA DETALLADA */}
      <div style={{ display: 'grid', gridTemplateColumns: paciente ? '340px 1fr' : '1fr', gap: '1.4rem' }}>
        
        {/* PANEL IZQUIERDO: LISTA DE BUSQUEDA DE PACIENTES */}
        <div className="glass-panel" style={{ padding: '1.2rem' }}>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Buscar CUI, nombre o apellido..." 
              className="input-field"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Pacientes ({pacientesFiltrados.length})
            </span>
            {isOfflineMode && <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700 }}>Modo Local</span>}
          </div>

          {loading ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b' }}>
              Cargando catálogo...
            </div>
          ) : pacientesFiltrados.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
              No se encontraron expedientes.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '600px', overflowY: 'auto' }}>
              {pacientesFiltrados.map((p) => {
                const isSelected = paciente?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => seleccionarPaciente(p)}
                    style={{
                      padding: '0.8rem 0.9rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isSelected ? '#e0f2fe' : '#ffffff',
                      border: `1px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`,
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: isSelected ? '#0284c7' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#0369a1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.85rem'
                    }}>
                      {getInitials(`${p.nombres} ${p.apellidos}`)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.nombres} {p.apellidos}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                        CUI: {p.cui || 'S/N'}
                      </span>
                    </div>

                    {p.isOfflinePending && (
                      <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>Offline</span>
                    )}

                    <ChevronRight size={16} color={isSelected ? '#0284c7' : '#cbd5e1'} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PANEL DERECHO: FICHA DETALLADA Y ESQUEMA DEL PACIENTE SELECCIONADO */}
        {paciente ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            
            {/* TARJETA SUPERIOR: PERFIL DEL NIÑO */}
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '16px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '1.4rem', boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)'
                  }}>
                    {getInitials(`${paciente.nombres} ${paciente.apellidos}`)}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>
                      {paciente.nombres} {paciente.apellidos}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.8rem' }}>
                        CUI: {paciente.cui || 'No Registrado'}
                      </span>
                      <span className="badge badge-success" style={{ fontSize: '0.8rem' }}>
                        Edad: {calcularEdadDetallada(paciente.fecha_nacimiento)}
                      </span>
                      {paciente.isOfflinePending && (
                        <span className="badge badge-warning" style={{ fontSize: '0.8rem' }}>
                          ⚡ Pendiente de Sincronizar
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button 
                    onClick={() => setShowCarneModal(true)}
                    className="btn"
                    style={{ background: '#ffffff', borderColor: '#cbd5e1' }}
                  >
                    <Printer size={16} /> Carné Digital
                  </button>
                  <button 
                    onClick={() => handleAbrirModalDosis()}
                    className="btn btn-primary"
                  >
                    <ShieldPlus size={16} /> Aplicar Vacuna
                  </button>
                </div>
              </div>

              {/* METADATOS COMPLEMENTARIOS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.2rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                  <Calendar size={16} color="#0284c7" />
                  <span><strong>Nacimiento:</strong> {formatFechaClean(paciente.fecha_nacimiento)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                  <User size={16} color="#0284c7" />
                  <span><strong>Género:</strong> {paciente.genero === 'M' ? 'Masculino' : 'Femenino'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                  <MapPin size={16} color="#0284c7" />
                  <span><strong>Comunidad:</strong> {paciente.comunidad || 'Huehuetenango Central'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                  <HeartHandshake size={16} color="#0284c7" />
                  <span><strong>Tutor:</strong> {tutorInfo ? `${tutorInfo.nombre} (${tutorInfo.parentesco})` : 'No asignado'}</span>
                </div>
              </div>
            </div>

            {/* SECCION ESQUEMA DE VACUNACION */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <ListChecks size={22} color="var(--primary)" />
                  <h3 style={{ margin: 0 }}>Esquema Nacional de Inmunización MSPAS</h3>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '0.2rem', borderRadius: '8px' }}>
                  <button
                    onClick={() => setActiveTab('esquema')}
                    style={{
                      padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700,
                      background: activeTab === 'esquema' ? '#ffffff' : 'transparent',
                      color: activeTab === 'esquema' ? '#0284c7' : '#64748b',
                      boxShadow: activeTab === 'esquema' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    Esquema Oficial
                  </button>
                  <button
                    onClick={() => setActiveTab('historial')}
                    style={{
                      padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700,
                      background: activeTab === 'historial' ? '#ffffff' : 'transparent',
                      color: activeTab === 'historial' ? '#0284c7' : '#64748b',
                      boxShadow: activeTab === 'historial' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    Historial Aplicado ({dosisAplicadas.length})
                  </button>
                </div>
              </div>

              {/* TAB 1: ESQUEMA OFICIAL BASE */}
              {activeTab === 'esquema' && (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Vacuna</th>
                        <th>Dosis</th>
                        <th>Edad Sugerida</th>
                        <th>Estado / Aplicación</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {esquemaBase.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>
                            Cargando esquema oficial de dosis...
                          </td>
                        </tr>
                      ) : (
                        esquemaBase.map((esq) => {
                          const dosisReal = dosisAplicadas.find(
                            d => String(d.biologico_id) === String(esq.biologico_id) && Number(d.numero_dosis) === Number(esq.numero_dosis)
                          );
                          const esAplicada = !!dosisReal;

                          return (
                            <tr key={esq.id || `${esq.biologico_id}-${esq.numero_dosis}`}>
                              <td style={{ fontWeight: 700, color: '#0f172a' }}>
                                {getBiologicoNombre(esq.biologico_id, esq.biologico_nombre || 'Vacuna')}
                              </td>
                              <td>Dosis #{esq.numero_dosis}</td>
                              <td>{esq.edad_meses_recomendada === 0 ? 'Al nacer' : `${esq.edad_meses_recomendada} meses`}</td>
                              <td>
                                {esAplicada ? (
                                  <span className="badge badge-success" style={{ gap: '0.3rem' }}>
                                    <CheckCircle2 size={13} /> {dosisReal.fecha_aplicacion} (Lote: {dosisReal.lote})
                                  </span>
                                ) : (
                                  <span className="badge badge-warning" style={{ gap: '0.3rem' }}>
                                    <Clock size={13} /> Pendiente
                                  </span>
                                )}
                              </td>
                              <td>
                                {esAplicada ? (
                                  <button
                                    onClick={() => handleAnularDosis(dosisReal.id)}
                                    className="btn"
                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5', fontWeight: 700 }}
                                    title="Anular aplicación de esta dosis"
                                  >
                                    Anular Dosis
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAbrirModalDosis(esq.biologico_id, esq.numero_dosis)}
                                    className="btn btn-primary"
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                  >
                                    Registrar Vacuna
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: HISTORIAL TIMELINE */}
              {activeTab === 'historial' && (
                <div style={{ padding: '0.5rem 0' }}>
                  {dosisAplicadas.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      No hay dosis registradas para este paciente.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {dosisAplicadas.map((d, idx) => (
                        <div key={d.id || idx} style={{
                          padding: '0.9rem 1.1rem',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          background: d.isOfflinePending ? '#fffbeb' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'space-between'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <CheckCircle2 size={18} />
                            </div>
                            <div>
                              <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>
                                {getBiologicoNombre(d.biologico_id, d.biologico_nombre)} - Dosis #{d.numero_dosis}
                              </strong>
                              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                Lote: {d.lote} • Aplicado el {d.fecha_aplicacion}
                              </span>
                            </div>
                          </div>

                          {d.isOfflinePending ? (
                            <span className="badge badge-warning">Guardado Offline</span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span className="badge badge-success">Verificado</span>
                              <button
                                onClick={() => handleAnularDosis(d.id)}
                                className="btn"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5', fontWeight: 700 }}
                                title="Anular registro de dosis"
                              >
                                Anular Dosis
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        ) : (
          /* ESTADO VACIO: SELECCIONE UN PACIENTE */
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', background: '#ffffff' }}>
            <Baby size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
            <h3 style={{ color: '#475569', marginBottom: '0.4rem' }}>Seleccione un expediente de la lista</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
              Elija un niño para consultar su esquema de inmunización, historial de vacunas aplicadas y carné digital.
            </p>
          </div>
        )}

      </div>

      {/* MODAL CREAR NUEVO PACIENTE Y TUTOR */}
      {showNuevoModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '580px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ background: '#0f172a', color: '#ffffff', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Baby size={20} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>Registro de Nuevo Paciente Infantil</h3>
              </div>
              <button onClick={() => setShowNuevoModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8' }}>✕</button>
            </div>

            <form onSubmit={handleCrearPaciente} style={{ padding: '1.4rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>CUI del Niño / Código</label>
                  <input type="text" className="input-field" required value={nuevoPaciente.cui} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, cui: e.target.value })} placeholder="Ej: 3012 45892 1301" />
                </div>
                <div className="input-group">
                  <label>Fecha de Nacimiento</label>
                  <input type="date" className="input-field" required value={nuevoPaciente.fecha_nacimiento} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, fecha_nacimiento: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Nombres del Niño</label>
                  <input type="text" className="input-field" required value={nuevoPaciente.nombres} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, nombres: e.target.value })} placeholder="Ej: Mateo Alexander" />
                </div>
                <div className="input-group">
                  <label>Apellidos</label>
                  <input type="text" className="input-field" required value={nuevoPaciente.apellidos} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, apellidos: e.target.value })} placeholder="Ej: Gómez López" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Género</label>
                  <select className="input-field" value={nuevoPaciente.genero} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, genero: e.target.value })}>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Comunidad / Aldea</label>
                  <input type="text" className="input-field" value={nuevoPaciente.comunidad} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, comunidad: e.target.value })} placeholder="Ej: Aldea San José" />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.5rem', paddingTop: '1rem', marginBottom: '0.8rem' }}>
                <h4 style={{ color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.8rem' }}>
                  <HeartHandshake size={16} /> Datos del Tutor / Responsable
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                  <div className="input-group" style={{ gridColumn: 'span 2' }}>
                    <label>Nombre del Tutor</label>
                    <input type="text" className="input-field" value={nuevoPaciente.tutor_nombre} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, tutor_nombre: e.target.value })} placeholder="Nombre de la Madre/Padre" />
                  </div>
                  <div className="input-group">
                    <label>Parentesco</label>
                    <select className="input-field" value={nuevoPaciente.tutor_parentesco} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, tutor_parentesco: e.target.value })}>
                      <option value="Madre">Madre</option>
                      <option value="Padre">Padre</option>
                      <option value="Abuelo/a">Abuelo/a</option>
                      <option value="Tío/a">Tío/a</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowNuevoModal(false)} className="btn">Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {isOfflineMode ? 'Guardar Offline' : 'Guardar Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR DOSIS APLICADA */}
      {showDosisModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '480px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ background: '#0284c7', color: '#ffffff', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ShieldPlus size={20} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>Registrar Aplicación de Vacuna</h3>
              </div>
              <button onClick={() => setShowDosisModal(false)} style={{ background: 'transparent', border: 'none', color: '#ffffff' }}>✕</button>
            </div>

            <form onSubmit={handleRegistrarDosis} style={{ padding: '1.4rem' }}>
              <div className="input-group">
                <label>Vacuna / Biológico</label>
                <select 
                  className="input-field" 
                  value={nuevaDosis.biologico_id} 
                  onChange={(e) => handleBiologicoChange(e.target.value)}
                  required
                >
                  <option value="">Seleccione una vacuna...</option>
                  {biologicos.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre} ({b.codigo})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Número de Dosis</label>
                  <input type="number" min="1" max="5" className="input-field" required value={nuevaDosis.numero_dosis} onChange={(e) => setNuevaDosis({ ...nuevaDosis, numero_dosis: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>Fecha de Aplicación</label>
                  <input type="date" className="input-field" required value={nuevaDosis.fecha_aplicacion} onChange={(e) => setNuevaDosis({ ...nuevaDosis, fecha_aplicacion: e.target.value })} />
                </div>
              </div>

              <div className="input-group">
                <label>Lote de Vacuna</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required 
                  value={nuevaDosis.lote} 
                  onChange={(e) => setNuevaDosis({ ...nuevaDosis, lote: e.target.value })} 
                  placeholder="Ej: LOT-2026-BCG" 
                />
                {pepsSugerencia && (
                  <span style={{ fontSize: '0.75rem', color: pepsSugerencia.isOfflineCache ? '#0284c7' : '#16a34a', fontWeight: 'bold', marginTop: '0.25rem', display: 'block' }}>
                    ✔ Lote PEPS Sugerido {pepsSugerencia.isOfflineCache ? '(Modo Offline)' : 'automáticamente'}: {pepsSugerencia.codigo_lote} ({pepsSugerencia.fecha_vencimiento ? `Vence: ${pepsSugerencia.fecha_vencimiento}` : 'Sugerido'})
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.2rem' }}>
                <button type="button" onClick={() => setShowDosisModal(false)} className="btn">Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {isOfflineMode ? 'Registrar Offline' : 'Registrar Inmunización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CARNE DIGITAL DE VACUNACION */}
      {showCarneModal && paciente && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '650px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ background: '#0f172a', color: '#ffffff', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Printer size={20} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>Carné Digital de Inmunización MSPAS</h3>
              </div>
              <button onClick={() => setShowCarneModal(false)} style={{ background: 'transparent', border: 'none', color: '#ffffff' }}>✕</button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ border: '2px solid #0284c7', borderRadius: '12px', padding: '1.2rem', background: '#f0f9ff', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #bae6fd', paddingBottom: '0.8rem', marginBottom: '0.8rem' }}>
                  <div>
                    <strong style={{ fontSize: '1.1rem', color: '#0369a1' }}>{paciente.nombres} {paciente.apellidos}</strong>
                    <span style={{ display: 'block', fontSize: '0.82rem', color: '#0284c7' }}>CUI: {paciente.cui}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.78rem', color: '#475569', display: 'block' }}>Red de Salud Huehuetenango</span>
                    <span className="badge badge-success">MSPAS Guatemala</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  <p><strong>Nacimiento:</strong> {paciente.fecha_nacimiento}</p>
                  <p><strong>Comunidad:</strong> {paciente.comunidad || 'Huehuetenango'}</p>
                  <p><strong>Tutor:</strong> {tutorInfo?.nombre || 'Registrado'}</p>
                  <p><strong>Total Dosis:</strong> {dosisAplicadas.length}</p>
                </div>
              </div>

              <h4 style={{ marginBottom: '0.6rem', color: '#0f172a' }}>Registro de Dosis Aplicadas</h4>
              <div className="table-container" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Vacuna</th>
                      <th>Dosis</th>
                      <th>Fecha</th>
                      <th>Lote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dosisAplicadas.map((d, i) => (
                      <tr key={i}>
                        <td>{getBiologicoNombre(d.biologico_id, d.biologico_nombre)}</td>
                        <td>#{d.numero_dosis}</td>
                        <td>{d.fecha_aplicacion}</td>
                        <td>{d.lote}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.2rem' }}>
                <button onClick={() => window.print()} className="btn btn-primary">
                  <Printer size={16} /> Imprimir Carné
                </button>
                <button onClick={() => setShowCarneModal(false)} className="btn">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RegistroNominal;
