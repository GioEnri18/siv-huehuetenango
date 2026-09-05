import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { Syringe, Clock, Calendar, Info, Search, Sparkles } from 'lucide-react';

const VACUNAS_DETALLES = {
  'BCG': {
    descripcion: 'Vacuna contra la Tuberculosis Infantil (formas graves como meningitis tuberculosa).',
    dosisInfo: '1 sola dosis única al nacer.',
    edadRecomendada: 'Recién nacido (0 a 28 días)',
    vias: 'Intradérmica (Brazo derecho)',
    enfermedades: ['Tuberculosis Meníngea', 'Tuberculosis Diseminada'],
    color: '#2563eb'
  },
  'Hepatitis B': {
    descripcion: 'Protege contra la infección por el virus de la Hepatitis B transmitido durante el parto o en la infancia.',
    dosisInfo: '1 dosis al nacer dentro de las primeras 24 horas.',
    edadRecomendada: 'Recién nacido (Primeras 24h)',
    vias: 'Intramuscular',
    enfermedades: ['Infección aguda y crónica por Hepatitis B'],
    color: '#0284c7'
  },
  'Pentavalente': {
    descripcion: 'Vacuna combinada esencial que otorga protección simultánea contra 5 enfermedades graves.',
    dosisInfo: '3 dosis (2, 4 y 6 meses). Intervalo mínimo entre dosis: 4 semanas.',
    edadRecomendada: '2 meses, 4 meses y 6 meses',
    vias: 'Intramuscular (Muslo)',
    enfermedades: ['Difteria', 'Tétanos', 'Tos Ferina', 'Hepatitis B', 'Infecciones por Hib'],
    color: '#059669'
  },
  'Neumococo': {
    descripcion: 'Inmuniza contra la bacteria Streptococcus pneumoniae causante de neumonías y meningitis bacteriana.',
    dosisInfo: '3 dosis (2 dosis en lactantes + 1 refuerzo al año).',
    edadRecomendada: '2 meses, 4 meses y 12 meses (refuerzo)',
    vias: 'Intramuscular',
    enfermedades: ['Neumonía', 'Meningitis Bacteriana', 'Otitis Media'],
    color: '#7c3aed'
  },
  'Rotavirus': {
    descripcion: 'Protege contra las gastroenteritis severas y deshidratación grave provocadas por Rotavirus en lactantes.',
    dosisInfo: '2 dosis orales (2 y 4 meses).',
    edadRecomendada: '2 meses y 4 meses',
    vias: 'Vía Oral',
    enfermedades: ['Diarreas graves por Rotavirus', 'Deshidratación infantil'],
    color: '#d97706'
  },
  'SPR': {
    descripcion: 'Vacuna trivalente viral que previene infecciones altamente contagiosas de la infancia.',
    dosisInfo: '2 dosis (12 meses y 18 meses).',
    edadRecomendada: '12 meses (1 año) y 18 meses (1 año y medio)',
    vias: 'Subcutánea',
    enfermedades: ['Sarampión', 'Parotiditis (Paperas)', 'Rubéola'],
    color: '#dc2626'
  },
  'DPT Refuerzo': {
    descripcion: 'Dosis de refuerzo para extender la inmunidad adquirida contra difteria, tétanos y tos ferina.',
    dosisInfo: '2 dosis de refuerzo (1er refuerzo a los 18 meses, 2do refuerzo a los 4 años).',
    edadRecomendada: '18 meses y 4 años de edad',
    vias: 'Intramuscular',
    enfermedades: ['Difteria', 'Tétanos', 'Tos Ferina'],
    color: '#9333ea'
  }
};

const VacunasInfo = () => {
  const [biologicos, setBiologicos] = useState([]);
  const [esquema, setEsquema] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resBio, resEsq] = await Promise.all([
          axios.get(`${API_URL}/api/biologico`),
          axios.get(`${API_URL}/api/esquema_dosis`)
        ]);
        setBiologicos(resBio.data);
        setEsquema(resEsq.data);
      } catch (error) {
        console.error('Error al cargar catálogo de vacunas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredBiologicos = biologicos.filter(b => 
    b.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (VACUNAS_DETALLES[b.nombre]?.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div>Cargando esquema de vacunación...</div>;

  return (
    <div>
      {/* HEADER DE INFORMACION */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="flex items-center gap-2">
            <Syringe size={28} color="var(--primary)" /> Catálogo Informativo de Vacunas
          </h1>
          <p className="text-text-muted">Esquema nacional de inmunización infantil (0 a 6 años) - Huehuetenango, Guatemala</p>
        </div>
      </div>

      {/* BANNER DESTACADO */}
      <div className="glass-panel mb-4" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderLeft: '5px solid #2563eb' }}>
        <div className="flex items-center gap-3">
          <Sparkles size={24} color="#1d4ed8" />
          <div>
            <h3 style={{ margin: 0, color: '#1e40af' }}>Esquema de Vacunación Oficial</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e3a8a' }}>
              Consulte las dosis recomendadas, intervalos mínimos y enfermedades prevenibles para garantizar esquemas completos en los niños atendidos en los Puestos de Salud.
            </p>
          </div>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="glass-panel mb-4" style={{ padding: '1rem' }}>
        <div style={{ position: 'relative', display: 'flex', itemsAlign: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '2.4rem', marginBottom: 0 }}
            placeholder="Buscar vacuna por nombre o enfermedad prevenible..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* LISTADO DE TARJETAS INFORMATIVAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {filteredBiologicos.map((b) => {
          const infoExtra = VACUNAS_DETALLES[b.nombre] || {
            descripcion: 'Vacuna del esquema oficial de inmunización infantil.',
            dosisInfo: `${b.dosis_totales} dosis estipuladas.`,
            edadRecomendada: 'Según calendario clínico',
            vias: 'Intramuscular / Oral',
            enfermedades: ['Enfermedades inmunoprevenibles'],
            color: 'var(--primary)'
          };


          return (
            <div key={b.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', borderTop: `4px solid ${infoExtra.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <div>
                  <h2 style={{ margin: 0, color: infoExtra.color, fontSize: '1.4rem' }}>{b.nombre}</h2>
                  <span className="badge badge-primary" style={{ marginTop: '0.4rem', display: 'inline-block' }}>
                    {b.dosis_totales} {b.dosis_totales === 1 ? 'Dosis Única' : 'Dosis Totales'}
                  </span>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Syringe size={22} color={infoExtra.color} />
                </div>
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: '1rem 0 0.8rem', lineHeight: '1.5' }}>
                {infoExtra.descripcion}
              </p>

              {/* ENFERMEDADES PREVENIBLES */}
              <div style={{ background: 'rgba(241, 245, 249, 0.7)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  🛡️ ENFERMEDADES PREVENIBLES:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {infoExtra.enfermedades.map((enf, idx) => (
                    <span key={idx} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.78rem', color: '#334155' }}>
                      {enf}
                    </span>
                  ))}
                </div>
              </div>

              {/* DETALLE DE CALENDARIO Y EDADES */}
              <div style={{ marginTop: 'auto', borderTop: '1px border-dashed #e2e8f0', paddingTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div className="flex items-center gap-2">
                  <Calendar size={16} color="var(--primary)" />
                  <span><strong>Edades recomendadas:</strong> {infoExtra.edadRecomendada}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} color="var(--primary)" />
                  <span><strong>Esquema:</strong> {infoExtra.dosisInfo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Info size={16} color="var(--primary)" />
                  <span><strong>Vía de administración:</strong> {infoExtra.vias}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VacunasInfo;
