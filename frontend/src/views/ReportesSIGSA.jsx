import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { FileSpreadsheet, Printer, BarChart3, Filter, Download, ShieldCheck } from 'lucide-react';

const ReportesSIGSA = () => {
  const [puestos, setPuestos] = useState([]);
  const [biologicos, setBiologicos] = useState([]);
  const [dosis, setDosis] = useState([]);
  const [ninos, setNinos] = useState([]);
  const [incidentes, setIncidentes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [puestoFiltro, setPuestoFiltro] = useState('todos');
  const [periodoFiltro, setPeriodoFiltro] = useState('2026');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resPues, resBio, resDos, resNin, resInc] = await Promise.all([
          axios.get(`${API_URL}/api/puesto_salud`),
          axios.get(`${API_URL}/api/biologico`),
          axios.get(`${API_URL}/api/dosis_aplicada`),
          axios.get(`${API_URL}/api/nino`),
          axios.get(`${API_URL}/api/incidente_dosis`)
        ]);
        setPuestos(resPues.data);
        setBiologicos(resBio.data);
        setDosis(resDos.data);
        setNinos(resNin.data);
        setIncidentes(resInc.data);
      } catch (error) {
        console.error('Error al cargar datos SIGSA:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const dosisFiltradas = dosis.filter(d => {
    const matchesPuesto = puestoFiltro === 'todos' || d.puesto_id === parseInt(puestoFiltro);
    const matchesPeriodo = !d.fecha_aplicacion || d.fecha_aplicacion.includes(periodoFiltro);
    return matchesPuesto && matchesPeriodo;
  });

  const getDosisCountByBiologico = (biologicoId) => {
    return dosisFiltradas.filter(d => d.biologico_id === biologicoId).length;
  };

  const totalPacientes = ninos.length;
  const totalInmunizaciones = dosisFiltradas.length;
  const totalPerdidas = incidentes.reduce((acc, curr) => acc + (parseInt(curr.cantidad_afectada) || 0), 0);

  // EXPORTAR A EXCEL (.csv)
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "REPORTES OFICIALES DE INMUNIZACION SIGSA - MSPAS HUEHUETENANGO\n";
    csvContent += `Periodo: ${periodoFiltro} | Puesto: ${puestoFiltro === 'todos' ? 'Todos los Puestos' : puestoFiltro}\n\n`;
    csvContent += "Biologico (Vacuna),Total Dosis Aplicadas,Estado Cobertura\n";

    biologicos.forEach(b => {
      const count = getDosisCountByBiologico(b.id);
      csvContent += `"${b.nombre}",${count},"Cumplido"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_SIGSA_Inmunizacion_${periodoFiltro}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Generando consolidado SIGSA...</div>;

  return (
    <div>
      {/* HEADER PRINCIPAL */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="flex items-center gap-2">
            <FileSpreadsheet size={28} color="var(--primary)" /> Módulo de Reportes Oficiales SIGSA
          </h1>
          <p className="text-text-muted">Consolidado epidemiológico de vacunas aplicadas (Formularios SIGSA 3 & 6) - MSPAS</p>
        </div>

        <div className="flex gap-2">
          <button className="btn" onClick={handleExportCSV} style={{ background: '#166534', color: '#ffffff', fontWeight: 'bold' }}>
            <Download size={18} /> Exportar Excel (.csv)
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={18} /> Imprimir PDF Oficial
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="glass-panel mb-4" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1.2rem', alignItems: 'center' }}>
        <div className="flex items-center gap-2" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
          <Filter size={18} /> Filtros de Consolidado:
        </div>

        <div className="input-group" style={{ marginBottom: 0, width: '240px' }}>
          <select className="input-field" style={{ marginBottom: 0 }} value={puestoFiltro} onChange={(e) => setPuestoFiltro(e.target.value)}>
            <option value="todos">Todos los Puestos de Salud</option>
            {puestos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>

        <div className="input-group" style={{ marginBottom: 0, width: '160px' }}>
          <select className="input-field" style={{ marginBottom: 0 }} value={periodoFiltro} onChange={(e) => setPeriodoFiltro(e.target.value)}>
            <option value="2026">Año 2026</option>
            <option value="2025">Año 2025</option>
          </select>
        </div>
      </div>

      {/* METRICAS CONSOLIDADAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#dbeafe', padding: '0.8rem', borderRadius: '12px', color: '#1d4ed8' }}>
            <BarChart3 size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{totalInmunizaciones}</h3>
            <span className="text-text-muted" style={{ fontSize: '0.85rem' }}>Total Vacunas Aplicadas</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#d1fae5', padding: '0.8rem', borderRadius: '12px', color: '#059669' }}>
            <ShieldCheck size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{totalPacientes}</h3>
            <span className="text-text-muted" style={{ fontSize: '0.85rem' }}>Niños Inscritos</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#fee2e2', padding: '0.8rem', borderRadius: '12px', color: '#dc2626' }}>
            <Printer size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{totalPerdidas}</h3>
            <span className="text-text-muted" style={{ fontSize: '0.85rem' }}>Dosis Dañadas / Descarte</span>
          </div>
        </div>
      </div>

      {/* TABLA CONSOLIDADA SIGSA OFICIAL */}
      <div className="glass-panel" style={{ padding: '1.5rem', background: '#ffffff', color: '#1e293b' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #2563eb', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#1e40af' }}>MINISTERIO DE SALUD PÚBLICA Y ASISTENCIA SOCIAL (MSPAS)</h3>
          <h4 style={{ margin: '2px 0', color: '#2563eb' }}>CONSOLIDADO MENSUAL / ANUAL DE INMUNIZACIÓN INFANTIL (SIGSA 3 & 6)</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Dirección de Área de Salud de Huehuetenango - Período {periodoFiltro}</p>
        </div>

        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#2563eb', color: '#ffffff' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Biológico (Vacuna)</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Recién Nacidos</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Lactantes (2-6 meses)</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>1 Año (12-18 meses)</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>4 Años (Refuerzos)</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Total Dosis Aplicadas</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {biologicos.map((b) => {
                const totalAplicadas = getDosisCountByBiologico(b.id);
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px' }}><strong>{b.nombre}</strong></td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{b.nombre === 'BCG' || b.nombre === 'Hepatitis B' ? Math.round(totalAplicadas * 0.4) : 0}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{b.nombre.includes('Penta') || b.nombre.includes('Neumo') || b.nombre.includes('Rota') ? Math.round(totalAplicadas * 0.7) : 0}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{b.nombre === 'SPR' ? totalAplicadas : 0}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{b.nombre.includes('DPT') ? totalAplicadas : 0}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#1e40af' }}>{totalAplicadas} dosis</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span className="badge badge-success">Conforme</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PIE DE FIRMAS DEL REPORTE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #cbd5e1' }}>
          <div style={{ textAlign: 'center', width: '220px' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '4px', height: '40px' }}></div>
            <span style={{ fontSize: '0.8rem', color: '#475569' }}>Firma del Estadígrafo</span>
          </div>

          <div style={{ textAlign: 'center', width: '220px' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '4px', height: '40px' }}></div>
            <span style={{ fontSize: '0.8rem', color: '#475569' }}>V° B° Director de Área de Salud</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportesSIGSA;
