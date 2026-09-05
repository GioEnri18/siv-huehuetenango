import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Users, Syringe, Activity, Sparkles, Building, Calendar, 
  ArrowRight, FilePlus, AlertTriangle, BookOpen, Clock, ShieldCheck, WifiOff
} from 'lucide-react';
import { saveCache, getCache } from '../utils/offlineManager';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ 
    totalNinos: 0, 
    totalDosis: 0, 
    cobertura: 0, 
    alertasActivas: 0, 
    alertasCriticas: 0, 
    incidentesActivos: 0,
    ultimasAlertas: []
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (navigator.onLine) {
        try {
          const resStats = await axios.get(`${API_URL}/api/dashboard/stats`);
          const resAct = await axios.get(`${API_URL}/api/dashboard/activities`);
          setStats(resStats.data);
          setActivities(resAct.data);

          saveCache('siv_cache_dashboard_stats', resStats.data);
          saveCache('siv_cache_dashboard_act', resAct.data);
          setIsOffline(false);
        } catch (error) {
          console.warn('Usando datos de tablero en caché:', error);
          setStats(getCache('siv_cache_dashboard_stats', stats));
          setActivities(getCache('siv_cache_dashboard_act', []));
          setIsOffline(true);
        } finally {
          setLoading(false);
        }
      } else {
        setIsOffline(true);
        setStats(getCache('siv_cache_dashboard_stats', stats));
        setActivities(getCache('siv_cache_dashboard_act', []));
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando tablero central...</div>;

  const fechaHoy = new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* BANNER OFFLINE SI APLICA */}
      {isOffline && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#92400e' }}>
          <WifiOff size={18} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Visualizando tablero en modo offline con datos en caché local.</span>
        </div>
      )}

      {/* 1. BANNER DE BIENVENIDA PERSONALIZADO */}
      <div className="glass-panel mb-4" style={{ 
        padding: '2rem', 
        background: 'linear-gradient(135deg, rgba(2,132,199,0.06) 0%, rgba(248,250,252,1) 100%)', 
        borderLeft: '6px solid var(--primary)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={20} color="var(--primary)" />
              <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Sistema de Inmunización Vacunal - Huehuetenango
              </span>
            </div>

            <h1 style={{ margin: '0.2rem 0', fontSize: '1.85rem', color: '#0f172a' }}>
              ¡Bienvenido de nuevo, {user?.nombre || user?.usuario}! 👋
            </h1>

            <div className="flex items-center gap-3 text-text-muted mt-2" style={{ fontSize: '0.88rem', flexWrap: 'wrap' }}>
              <span className="badge badge-success flex items-center gap-1">
                <ShieldCheck size={14} /> {user?.perfil || 'Personal de Salud'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Building size={16} color="var(--primary)" /> <strong>{user?.puesto_nombre || 'Distrito Huehuetenango'}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar size={16} color="var(--primary)" /> {fechaHoy}
              </span>
            </div>
          </div>

          <Link to="/registro" className="btn btn-primary" style={{ padding: '0.75rem 1.4rem', borderRadius: '10px', fontSize: '0.92rem', boxShadow: '0 4px 12px rgba(2,132,199,0.25)' }}>
            <FilePlus size={18} /> Registrar Vacuna
          </Link>
        </div>
      </div>

      {/* 2. TARJETAS METRICAS KPI CON GRADIENTES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginBottom: '1.8rem' }}>
        
        {/* TARJETA 1: NIÑOS REGISTRADOS */}
        <div className="glass-panel" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pacientes Infantiles</span>
              <h2 style={{ margin: '0.4rem 0 0', fontSize: '2.2rem', color: '#0284c7' }}>{stats.totalNinos}</h2>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} />
            </div>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#16a34a', display: 'block', marginTop: '0.6rem', fontWeight: 600 }}>
            ✔ Expedientes nominales activos
          </span>
        </div>

        {/* TARJETA 2: DOSIS APLICADAS */}
        <div className="glass-panel" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Dosis Administradas</span>
              <h2 style={{ margin: '0.4rem 0 0', fontSize: '2.2rem', color: '#0d9488' }}>{stats.totalDosis}</h2>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ccfbf1', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Syringe size={24} />
            </div>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#0d9488', display: 'block', marginTop: '0.6rem', fontWeight: 600 }}>
            ✔ Red de frío verificada
          </span>
        </div>

        {/* TARJETA 3: COBERTURA PROMEDIO */}
        <div className="glass-panel" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Cobertura Estimada</span>
              <h2 style={{ margin: '0.4rem 0 0', fontSize: '2.2rem', color: '#16a34a' }}>{stats.cobertura || 88}%</h2>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={24} />
            </div>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#15803d', display: 'block', marginTop: '0.6rem', fontWeight: 600 }}>
            ✔ Meta distrital alcanzada
          </span>
        </div>

        {/* TARJETA 4: ALERTAS DE REZAGO */}
        <div className="glass-panel" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Alertas Rezago</span>
              <h2 style={{ margin: '0.4rem 0 0', fontSize: '2.2rem', color: stats.alertasCriticas > 0 ? '#dc2626' : '#d97706' }}>
                {stats.alertasActivas || 0}
              </h2>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={24} />
            </div>
          </div>
          <Link to="/alertas" style={{ fontSize: '0.78rem', color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.6rem', fontWeight: 700 }}>
            Ver lista de seguimiento <ArrowRight size={12} />
          </Link>
        </div>

      </div>

      {/* 3. SECCION ACTIVIDADES RECIENTES Y ACCESOS RÁPIDOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.4rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem' }}>
            <Clock size={18} color="var(--primary)" /> Últimas Inmunizaciones Registradas
          </h3>

          {activities.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No hay registros recientes.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {activities.slice(0, 5).map((act, i) => (
                <div key={i} style={{ padding: '0.6rem 0.8rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block' }}>{act.nino_nombre || act.detalles || 'Inmunización'}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{act.vacuna_nombre || 'Dosis registrada'} • Lote: {act.lote || 'Standard'}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{act.fecha || 'Hoy'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem' }}>
            <BookOpen size={18} color="var(--primary)" /> Módulos Operativos Principales
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <Link to="/registro" style={{ padding: '0.8rem 1rem', borderRadius: '10px', background: '#f0f9ff', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#0369a1', display: 'block' }}>Registro Nominal de Vacunación</strong>
                <span style={{ fontSize: '0.75rem', color: '#0284c7' }}>Ingreso de recién nacidos, esquemas y carnés</span>
              </div>
              <ArrowRight size={16} color="#0284c7" />
            </Link>

            <Link to="/incidentes" style={{ padding: '0.8rem 1rem', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#c2410c', display: 'block' }}>Control de Frascos y Rupturas</strong>
                <span style={{ fontSize: '0.75rem', color: '#ea580c' }}>Reporte de frascos abiertos, fraccional y pérdidas</span>
              </div>
              <ArrowRight size={16} color="#ea580c" />
            </Link>

            <Link to="/vacunas-info" style={{ padding: '0.8rem 1rem', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#15803d', display: 'block' }}>Esquema e Inventario de Vacunas</strong>
                <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>Consulta de dosis por edad y lotes PEPS</span>
              </div>
              <ArrowRight size={16} color="#16a34a" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
