import React, { useState } from 'react';
import { MapPin, Users, Syringe } from 'lucide-react';
import { Link } from 'react-router-dom';

const MUNICIPIOS_DATA = [
  { nombre: 'Huehuetenango (Cabecera)', puesto: 'Puesto de Salud Zona 4 / Sede Central', ninos: 4, dosis: 12, cobertura: 92, estado: 'Excelente' },
  { nombre: 'Chiantla', puesto: 'Puesto de Salud Chiantla', ninos: 2, dosis: 5, cobertura: 85, estado: 'Moderado' },
  { nombre: 'Malacatancito', puesto: 'Puesto de Salud Malacatancito', ninos: 2, dosis: 6, cobertura: 78, estado: 'Moderado' },
  { nombre: 'San Pedro Necta', puesto: 'Puesto de Salud San Pedro Necta', ninos: 1, dosis: 2, cobertura: 64, estado: 'Crítico' },
  { nombre: 'Santa Bárbara', puesto: 'Puesto de Salud Santa Bárbara', ninos: 1, dosis: 1, cobertura: 58, estado: 'Crítico' }
];

const MapaCobertura = () => {
  const [municipios] = useState(MUNICIPIOS_DATA);

  const getStatusColor = (cob) => {
    if (cob >= 90) return { bg: '#dcfce7', text: '#166534', border: '#22c55e', badge: 'Meta Cumplida 🟢' };
    if (cob >= 75) return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b', badge: 'Alerta Moderada 🟡' };
    return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444', badge: 'Zona Crítica 🔴' };
  };

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="flex items-center gap-2">
            <MapPin size={28} color="var(--primary)" /> Cobertura Vacunal por Municipio
          </h1>
          <p className="text-text-muted">Monitoreo geográfico y semaforización epidemiológica - Departamental Huehuetenango</p>
        </div>
      </div>

      {/* BANNER SEMAFORO */}
      <div className="glass-panel mb-4" style={{ padding: '1.2rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)' }}>
        <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>
          Rangos de Cobertura Vacunal (MSPAS):
        </div>
        <div className="flex gap-4 flex-wrap">
          <span style={{ background: '#dcfce7', color: '#166534', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 'bold' }}>
            🟢 ≥ 90%: Meta Cumplida
          </span>
          <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 'bold' }}>
            🟡 75% - 89%: Alerta Moderada
          </span>
          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 'bold' }}>
            🔴 &lt; 75%: Zona Crítica de Rezago
          </span>
        </div>
      </div>

      {/* GRILLA DE TARJETAS MUNICIPIOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {municipios.map((m, idx) => {
          const st = getStatusColor(m.cobertura);
          return (
            <div key={idx} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', borderTop: `5px solid ${st.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)' }}>{m.nombre}</h3>
                  <span className="text-text-muted" style={{ fontSize: '0.85rem' }}>{m.puesto}</span>
                </div>
                <span style={{ background: st.bg, color: st.text, padding: '0.2rem 0.7rem', borderRadius: '15px', fontSize: '0.78rem', fontWeight: 'bold' }}>
                  {st.badge}
                </span>
              </div>

              {/* PORCENTAJE DE COBERTURA */}
              <div style={{ margin: '1.2rem 0 0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="text-text-muted" style={{ fontSize: '0.85rem' }}>Cobertura Vacunal:</span>
                  <strong style={{ fontSize: '1.5rem', color: st.text }}>{m.cobertura}%</strong>
                </div>

                <div style={{ background: '#e2e8f0', height: '8px', borderRadius: '4px', marginTop: '0.4rem', overflow: 'hidden' }}>
                  <div style={{ background: st.border, height: '100%', width: `${m.cobertura}%`, transition: 'width 0.4s' }}></div>
                </div>
              </div>

              {/* DETALLES DE PACIENTES Y DOSIS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', background: 'rgba(241,245,249,0.7)', padding: '0.8rem', borderRadius: '8px', marginTop: 'auto' }}>
                <span className="flex items-center gap-1">
                  <Users size={16} color="var(--primary)" /> <strong>{m.ninos}</strong> niños
                </span>
                <span className="flex items-center gap-1">
                  <Syringe size={16} color="var(--primary)" /> <strong>{m.dosis}</strong> dosis
                </span>
              </div>

              <Link to="/alertas" className="btn" style={{ padding: '0.4rem', fontSize: '0.8rem', background: '#eff6ff', color: '#1e40af', textAlign: 'center', display: 'block', marginTop: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>
                Ver Alertas de Rezago →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MapaCobertura;
