import React, { createContext, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, Zap, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (mensaje, tipo = 'success', titulo = '') => {
    const id = Date.now() + Math.random();
    const newToast = { id, mensaje, tipo, titulo };
    
    setToasts(prev => [...prev, newToast]);

    // Auto eliminar después de 4.5 segundos
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* CONTENEDOR DE TOAST NOTIFICATIONS */}
      <div style={{
        position: 'fixed',
        top: '1.2rem',
        right: '1.2rem',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '420px',
        width: 'calc(100% - 2.4rem)',
        pointerEvents: 'none'
      }}>
        {toasts.map((toast) => {
          const isSuccess = toast.tipo === 'success';
          const isWarning = toast.tipo === 'warning' || toast.tipo === 'offline';
          const isDanger = toast.tipo === 'danger' || toast.tipo === 'error';
          
          let bgColor = '#ffffff';
          let borderColor = '#0284c7';
          let iconColor = '#0284c7';
          let IconComponent = Info;
          let defaultTitle = 'Notificación del Sistema';

          if (isSuccess) {
            borderColor = '#22c55e';
            iconColor = '#16a34a';
            IconComponent = CheckCircle2;
            defaultTitle = '¡Operación Exitosa!';
          } else if (isWarning) {
            borderColor = '#f59e0b';
            iconColor = '#b45309';
            IconComponent = toast.tipo === 'offline' ? Zap : AlertTriangle;
            defaultTitle = toast.tipo === 'offline' ? '⚡ Modo Offline Activo' : 'Advertencia del Sistema';
          } else if (isDanger) {
            borderColor = '#ef4444';
            iconColor = '#dc2626';
            IconComponent = AlertCircle;
            defaultTitle = 'Atención Requiere Acción';
          }

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                background: bgColor,
                borderLeft: `5px solid ${borderColor}`,
                borderTop: '1px solid #e2e8f0',
                borderRight: '1px solid #e2e8f0',
                borderBottom: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '0.9rem 1.1rem',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.8rem',
                animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ marginTop: '0.1rem', color: iconColor }}>
                <IconComponent size={22} />
              </div>

              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block', marginBottom: '0.2rem' }}>
                  {toast.titulo || defaultTitle}
                </strong>
                <span style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.4, display: 'block' }}>
                  {toast.mensaje}
                </span>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
