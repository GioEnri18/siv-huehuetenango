import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Layers, X, Database } from 'lucide-react';
import { getOfflineQueue, processOfflineQueue } from '../utils/offlineManager';

const OfflineSyncStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  const checkQueue = () => {
    const queue = getOfflineQueue();
    setOfflineQueue(queue);
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Intentar auto-sincronización discreta si hay elementos en la cola
      const queue = getOfflineQueue();
      if (queue.length > 0) {
        handleSincronizar();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkQueue();
    const interval = setInterval(checkQueue, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSincronizar = async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;
    
    setSincronizando(true);
    setLastSyncResult(null);

    const result = await processOfflineQueue();
    checkQueue();
    setSincronizando(false);
    setLastSyncResult(result);

    if (result.exitosos > 0 && result.fallidos === 0) {
      setTimeout(() => setLastSyncResult(null), 5000);
    }
  };

  const getBreakdown = () => {
    const counts = { ninos: 0, tutores: 0, dosis: 0, incidentes: 0 };
    offlineQueue.forEach(item => {
      if (item.type === 'CREAR_NINO') counts.ninos++;
      if (item.type === 'CREAR_TUTOR') counts.tutores++;
      if (item.type === 'REGISTRAR_DOSIS') counts.dosis++;
      if (item.type === 'REGISTRAR_INCIDENTE') counts.incidentes++;
    });
    return counts;
  };

  const breakdown = getBreakdown();

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      {/* BADGE DE ESTADO CONEXION */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            padding: '0.35rem 0.75rem', 
            borderRadius: '20px', 
            fontSize: '0.8rem', 
            fontWeight: '700',
            background: isOnline ? '#dcfce7' : '#fef3c7',
            color: isOnline ? '#15803d' : '#b45309',
            border: `1px solid ${isOnline ? '#bbf7d0' : '#fde68a'}`,
            transition: 'all 0.2s ease'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#22c55e' : '#f59e0b',
              boxShadow: isOnline ? '0 0 8px #22c55e' : '0 0 8px #f59e0b',
              animation: 'pulse 1.5s infinite'
            }}></span>
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isOnline ? 'Conectado (Servidor SIV)' : 'Modo Fuera de Línea'}
          </span>
        </div>

        {/* BOTON COLA OFFLINE SI HAY REGISTROS */}
        {offlineQueue.length > 0 && (
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '0.6rem 0.8rem',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            gap: '0.5rem',
            marginTop: '0.2rem'
          }}>
            <div 
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={() => setShowModal(true)}
            >
              <Database size={15} color="#38bdf8" />
              <div>
                <span style={{ color: '#f8fafc', fontSize: '0.8rem', fontWeight: 'bold', display: 'block' }}>
                  {offlineQueue.length} {offlineQueue.length === 1 ? 'registro pendiente' : 'registros pendientes'}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                  Haga clic para ver detalle
                </span>
              </div>
            </div>

            <button
              onClick={handleSincronizar}
              disabled={!isOnline || sincronizando}
              title={isOnline ? 'Sincronizar con servidor central' : 'Requiere conexión a internet'}
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                background: isOnline ? '#0284c7' : '#475569',
                color: '#ffffff',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                borderRadius: '6px',
                border: 'none',
                opacity: isOnline && !sincronizando ? 1 : 0.6,
                cursor: isOnline && !sincronizando ? 'pointer' : 'not-allowed'
              }}
            >
              <RefreshCw size={13} className={sincronizando ? 'animate-spin' : ''} />
              {sincronizando ? 'Sincronizando...' : 'Enviar'}
            </button>
          </div>
        )}

        {/* RESULTADO DE LA ULTIMA SINCRONIZACION */}
        {lastSyncResult && (
          <div style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            background: lastSyncResult.fallidos === 0 ? '#166534' : '#991b1b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            {lastSyncResult.fallidos === 0 ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>
              {lastSyncResult.fallidos === 0 
                ? `¡Sincronización completada! ${lastSyncResult.exitosos} enviado(s).` 
                : `Se enviaron ${lastSyncResult.exitosos}, quedaron ${lastSyncResult.fallidos} pendientes.`}
            </span>
          </div>
        )}
      </div>

      {/* MODAL DETALLE DE LA COLA OFFLINE */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#0f172a',
              color: '#ffffff',
              padding: '1rem 1.2rem',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#ffffff', fontWeight: 700 }}>
                  Cola de Sincronización Offline
                </h3>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.2rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
                Los siguientes registros fueron guardados localmente mientras el sistema estuvo fuera de línea y se enviarán al servidor central al reconectarse:
              </p>

              {/* RESUMEN POR CATEGORIA */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1.2rem' }}>
                <div style={{ padding: '0.6rem 0.8rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  <span style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 700 }}>Niños Nuevos:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7', display: 'block' }}>{breakdown.ninos}</span>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>Dosis Vacunas:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a', display: 'block' }}>{breakdown.dosis}</span>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', background: '#faf5ff', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
                  <span style={{ fontSize: '0.75rem', color: '#6b21a8', fontWeight: 700 }}>Tutores Registrados:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#9333ea', display: 'block' }}>{breakdown.tutores}</span>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', background: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                  <span style={{ fontSize: '0.75rem', color: '#c2410c', fontWeight: 700 }}>Incidentes / Daños:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ea580c', display: 'block' }}>{breakdown.incidentes}</span>
                </div>
              </div>

              {/* LISTADO INDIVIDUAL */}
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem' }}>
                {offlineQueue.map((item, idx) => (
                  <div key={item.id || idx} style={{
                    padding: '0.45rem 0.6rem',
                    borderBottom: idx === offlineQueue.length - 1 ? 'none' : '1px solid #f1f5f9',
                    fontSize: '0.78rem',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong style={{ color: '#0f172a' }}>{item.type.replace('_', ' ')}</strong>
                      <span style={{ display: 'block', color: '#64748b', fontSize: '0.72rem' }}>
                        {new Date(item.timestamp).toLocaleTimeString('es-GT')} - {item.data.nombres || item.data.nombre || `Niño ID: ${item.data.nino_id || 'N/A'}`}
                      </span>
                    </div>
                    <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Pendiente</span>
                  </div>
                ))}
              </div>

              {/* ACCIONES DEL MODAL */}
              <div style={{ marginTop: '1.2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button
                  onClick={() => setShowModal(false)}
                  className="btn"
                  style={{ fontSize: '0.85rem' }}
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    handleSincronizar();
                  }}
                  disabled={!isOnline || sincronizando}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem' }}
                >
                  <RefreshCw size={14} className={sincronizando ? 'animate-spin' : ''} />
                  Sincronizar Ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineSyncStatus;
