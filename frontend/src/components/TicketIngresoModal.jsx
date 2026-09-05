import React from 'react';
import { Printer, X, ShieldCheck, QrCode, Calendar, Building, User, FileText, Syringe, Box, Lock } from 'lucide-react';

const TicketIngresoModal = ({ ticket, onClose }) => {
  if (!ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  const fechaIngresoFormateada = ticket.fecha_ingreso 
    ? new Date(ticket.fecha_ingreso).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });

  const fechaVencimientoFormateada = ticket.fecha_vencimiento
    ? new Date(ticket.fecha_vencimiento).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
      {/* Estilos específicos de impresión */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-ticket, #printable-ticket * {
            visibility: visible !important;
          }
          #printable-ticket {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 15px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '620px', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #cbd5e1' }}>
        {/* BARRA SUPERIOR INSTITUCIONAL */}
        <div style={{ background: '#0f172a', color: '#ffffff', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} className="no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.4rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderRadius: '8px', display: 'flex' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: '#ffffff', fontWeight: 800, fontSize: '1rem' }}>Ticket Autorizado de Ingreso</h4>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>MSPAS • Sistema SIV Huehuetenango</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handlePrint}
              className="btn btn-primary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', gap: '0.4rem' }}
            >
              <Printer size={16} />
              <span>Imprimir Ticket</span>
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', color: '#94a3b8', fontSize: '1.2rem', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTENIDO DEL TICKET IMPRIMIBLE */}
        <div id="printable-ticket" style={{ padding: '1.5rem', background: '#ffffff', color: '#0f172a' }}>
          {/* LOGO & MEMBRETE OFICIAL */}
          <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#f0f9ff', color: '#0369a1', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid #bae6fd', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              <ShieldCheck size={14} style={{ color: '#0284c7' }} />
              <span>Ministerio de Salud Pública y Asistencia Social</span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
              Dirección de Área de Salud Huehuetenango
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
              Sistema de Información de Inmunizaciones (SIV) • Comprobante de Recepción Vacunal
            </p>
            <div style={{ paddingTop: '0.5rem' }}>
              <span style={{ display: 'inline-block', background: '#f1f5f9', color: '#0f172a', fontFamily: 'monospace', fontSize: '0.82rem', padding: '0.25rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 800 }}>
                {ticket.numero_ticket || 'TICK-ING-20260822-0000'}
              </span>
            </div>
          </div>

          {/* METADATOS CLAVE DE RECEPCIÓN */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                <Calendar size={13} style={{ color: '#0284c7' }} /> Fecha de Recepción:
              </span>
              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{fechaIngresoFormateada}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                <Building size={13} style={{ color: '#0284c7' }} /> Puesto Receptor:
              </span>
              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{ticket.puesto_nombre || 'Sede Central Huehuetenango'}</span>
            </div>
          </div>

          {/* TABLA RESUMEN DEL BIOLÓGICO */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{ background: '#f1f5f9', padding: '0.5rem 1rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Syringe size={14} style={{ color: '#0284c7' }} /> Biológico y Lote Recibido
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#475569', fontWeight: 500 }}>Biológico / Vacuna:</span>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{ticket.biologico_nombre || 'BCG'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                <span style={{ color: '#475569', fontWeight: 500 }}>Código de Lote:</span>
                <span className="badge badge-warning" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {ticket.codigo_lote}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Total Dosis Ingresadas:</span>
                  <span style={{ fontWeight: 800, color: '#166534', fontSize: '0.95rem' }}>+{ticket.cantidad_dosis} dosis</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Frascos y Presentación:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{ticket.cantidad_frascos || 1} frascos ({ticket.dosis_por_frasco || 1} dosis/frasco)</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#475569', fontWeight: 500 }}>Fecha de Vencimiento:</span>
                <span style={{ fontWeight: 800, color: '#dc2626' }}>{fechaVencimientoFormateada}</span>
              </div>
            </div>
          </div>

          {/* DATOS DE DOCUMENTACIÓN Y PROVEEDOR */}
          <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
              <Box size={14} style={{ color: '#0284c7', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Proveedor / Origen: </span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>{ticket.proveedor_origen || 'PAHO / MSPAS Central'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
              <FileText size={14} style={{ color: '#0284c7', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Documento de Referencia: </span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>{ticket.documento_referencia || 'N/A'}</span>
              </div>
            </div>
            {ticket.observaciones && (
              <div style={{ paddingTop: '0.3rem', borderTop: '1px solid #e2e8f0', color: '#475569', fontStyle: 'italic' }}>
                <span style={{ fontWeight: 600, color: '#334155', fontStyle: 'normal' }}>Observaciones: </span>
                {ticket.observaciones}
              </div>
            )}
          </div>

          {/* AUDITORÍA DE REGISTRO & SECCIÓN DE FIRMAS */}
          <div style={{ paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534' }}>
              <Lock size={14} style={{ color: '#166534', flexShrink: 0 }} />
              <div>
                <span style={{ fontWeight: 600 }}>Registro Autorizado por: </span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{ticket.recibido_por_nombre || ticket.recibido_por_usuario || 'Administrador del Sistema'}</span>
                {ticket.recibido_por_cargo && <span style={{ color: '#475569' }}> ({ticket.recibido_por_cargo})</span>}
              </div>
            </div>

            {/* SECCIÓN DE FIRMAS PARA REPECHO FÍSICO */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', paddingTop: '1.2rem', textAlign: 'center', fontSize: '0.72rem', color: '#64748b' }}>
              <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '0.4rem' }}>
                <p style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>Entregado Por (Remesa)</p>
                <p style={{ margin: 0 }}>Firma y Sello de Transporte / Despacho</p>
              </div>
              <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '0.4rem' }}>
                <p style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>Recibido Conforme (Recepción)</p>
                <p style={{ margin: 0 }}>Firma y Sello Puesto de Salud</p>
              </div>
            </div>

            {/* BARCODE / VERIFICACIÓN HASH */}
            <div style={{ paddingTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <QrCode size={28} style={{ color: '#334155' }} />
                <div style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                  <p style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>SIV-MSPAS-VERIFIED</p>
                  <p style={{ margin: 0 }}>ID: {ticket.numero_ticket || 'TICK-ING'}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>Comprobante Oficial de Control Vacunal</p>
                <p style={{ margin: 0 }}>República de Guatemala • SIV Huehuetenango</p>
              </div>
            </div>
          </div>
        </div>

        {/* PIE CON BOTÓN EN MODAL */}
        <div style={{ background: '#f8fafc', padding: '0.75rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }} className="no-print">
          <button
            onClick={onClose}
            className="btn"
            style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
          >
            Cerrar Comprobante
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketIngresoModal;
