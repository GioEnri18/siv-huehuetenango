import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { Plus, User, Mail, Building, Search, LayoutGrid, List, UserCheck, Stethoscope, BarChart3, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEFAULT_PERFILES = [
  { id: 1, nombre: 'Administrador' },
  { id: 2, nombre: 'Director de Área' },
  { id: 3, nombre: 'Estadígrafo' },
  { id: 4, nombre: 'Enfermero' }
];

const ROLE_COLORS = {
  'Administrador': { bg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', text: '#ffffff', badgeBg: '#dbeafe', badgeText: '#1e40af', icon: ShieldCheck },
  'Director de Área': { bg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', text: '#ffffff', badgeBg: '#f3e8ff', badgeText: '#6b21a8', icon: UserCheck },
  'Estadígrafo': { bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)', text: '#ffffff', badgeBg: '#d1fae5', badgeText: '#065f46', icon: BarChart3 },
  'Enfermero': { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', text: '#ffffff', badgeBg: '#fef3c7', badgeText: '#92400e', icon: Stethoscope }
};

const Usuarios = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [perfiles, setPerfiles] = useState(DEFAULT_PERFILES);
  const [puestos, setPuestos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [selectedUserForPass, setSelectedUserForPass] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('todos');

  const [formData, setFormData] = useState({
    nombre: '', usuario: '', correo: '', password: '', perfil_id: '', puesto_id: ''
  });

  const fetchData = async () => {
    try {
      const resUsers = await axios.get(`${API_URL}/api/usuario`);
      setUsuarios(resUsers.data);

      try {
        const resPerfiles = await axios.get(`${API_URL}/api/perfil`);
        if (resPerfiles.data && resPerfiles.data.length > 0) {
          setPerfiles(resPerfiles.data);
        }
      } catch (e) {
        console.log('Usando perfiles predeterminados');
      }

      try {
        const resPuestos = await axios.get(`${API_URL}/api/puesto_salud`);
        setPuestos(resPuestos.data);
      } catch (e) {
        console.error('Error al cargar puestos:', e);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = () => {
    setFormData({
      nombre: '',
      usuario: '',
      correo: '',
      password: '',
      perfil_id: perfiles[0]?.id || '',
      puesto_id: user?.puesto_id || puestos[0]?.id || ''
    });
    setShowModal(true);
  };

  const handleOpenChangePassModal = (u) => {
    setSelectedUserForPass(u);
    setNewPasswordInput('');
    setShowChangePassModal(true);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/usuario`, {
        nombre: formData.nombre,
        usuario: formData.usuario,
        correo: formData.correo,
        password_hash: formData.password,
        perfil_id: formData.perfil_id,
        puesto_id: formData.puesto_id
      });
      setShowModal(false);
      setFormData({ nombre: '', usuario: '', correo: '', password: '', perfil_id: '', puesto_id: '' });
      fetchData();
    } catch (error) {
      alert('Error al crear usuario');
    }
  };

  const handleSaveNewPassword = async (e) => {
    e.preventDefault();
    if (!selectedUserForPass || !newPasswordInput) return;
    try {
      await axios.put(`${API_URL}/api/usuario/${selectedUserForPass.id}`, {
        password_hash: newPasswordInput
      });
      alert(`✅ Contraseña de ${selectedUserForPass.nombre} actualizada correctamente.`);
      setShowChangePassModal(false);
      setNewPasswordInput('');
      setSelectedUserForPass(null);
    } catch (error) {
      alert('Error al actualizar la contraseña del usuario');
    }
  };

  const getPerfilNombre = (id) => perfiles.find(p => p.id === id)?.nombre || id;
  const getPuestoNombre = (id) => puestos.find(p => p.id === id)?.nombre || id;

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
  };

  // Filtrado de usuarios
  const filteredUsers = usuarios.filter(u => {
    const roleName = getPerfilNombre(u.perfil_id);
    const matchesSearch = 
      u.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.usuario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.correo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'todos' || roleName === filterRole;
    return matchesSearch && matchesRole;
  });

  // Métricas
  const totalAdmins = usuarios.filter(u => getPerfilNombre(u.perfil_id) === 'Administrador').length;
  const totalEnfermeros = usuarios.filter(u => getPerfilNombre(u.perfil_id) === 'Enfermero').length;
  const totalEstadigrafos = usuarios.filter(u => getPerfilNombre(u.perfil_id) === 'Estadígrafo' || getPerfilNombre(u.perfil_id) === 'Director de Área').length;

  if (loading) return <div>Cargando usuarios...</div>;

  return (
    <div>
      {/* HEADER PRINCIPAL */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Gestión de Personal de Salud</h1>
          <p className="text-text-muted">Cuentas activas, accesos por rol y cambio de contraseñas de personal</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenModal}>
          <Plus size={20} /> Nuevo Usuario
        </button>
      </div>

      {/* METRICAS VISUALES DE PERSONAL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#dbeafe', borderRadius: '12px', padding: '0.8rem', color: '#1d4ed8' }}>
            <User size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{usuarios.length}</h3>
            <span className="text-text-muted" style={{ fontSize: '0.85rem' }}>Total Personal</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#dbeafe', borderRadius: '12px', padding: '0.8rem', color: '#2563eb' }}>
            <ShieldCheck size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{totalAdmins}</h3>
            <span className="text-text-muted" style={{ fontSize: '0.85rem' }}>Administradores</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '0.8rem', color: '#d97706' }}>
            <Stethoscope size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{totalEnfermeros}</h3>
            <span className="text-text-muted" style={{ fontSize: '0.85rem' }}>Enfermeros</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#d1fae5', borderRadius: '12px', padding: '0.8rem', color: '#059669' }}>
            <BarChart3 size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{totalEstadigrafos}</h3>
            <span className="text-text-muted" style={{ fontSize: '0.85rem' }}>Estadígrafos / Directores</span>
          </div>
        </div>
      </div>

      {/* BARRA DE CONTROLES: BUSCADOR Y TOGGLE DE VISTA */}
      <div className="glass-panel mb-4" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '280px' }}>
          <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: '2.4rem', marginBottom: 0 }}
                placeholder="Buscar por nombre, usuario o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 0, width: '200px' }}>
            <select className="input-field" style={{ marginBottom: 0 }} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="todos">Todos los Roles</option>
              <option value="Administrador">Administradores</option>
              <option value="Enfermero">Enfermeros</option>
              <option value="Estadígrafo">Estadígrafos</option>
              <option value="Director de Área">Directores</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
          <button
            className={`btn ${viewMode === 'grid' ? 'btn-primary' : ''}`}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem' }}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid size={16} /> Tarjetas
          </button>
          <button
            className={`btn ${viewMode === 'table' ? 'btn-primary' : ''}`}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem' }}
            onClick={() => setViewMode('table')}
          >
            <List size={16} /> Tabla
          </button>
        </div>
      </div>

      {/* VISTA EN TARJETAS (CARDS GRID) */}
      {viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {filteredUsers.map((u) => {
            const roleName = getPerfilNombre(u.perfil_id);
            const styleConfig = ROLE_COLORS[roleName] || ROLE_COLORS['Administrador'];
            const RoleIcon = styleConfig.icon;

            return (
              <div key={u.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', borderTop: `4px solid ${styleConfig.badgeText}` }}>
                {/* Header de Tarjeta: Avatar y Estado */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: styleConfig.bg, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
                    {getInitials(u.nombre)}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>{u.nombre}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{u.usuario}</span>
                  </div>
                </div>

                {/* Badge de Rol */}
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ background: styleConfig.badgeBg, color: styleConfig.badgeText, padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <RoleIcon size={14} /> {roleName}
                  </span>

                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: u.estado === 'Activo' ? '#166534' : '#991b1b', background: u.estado === 'Activo' ? '#dcfce7' : '#fee2e2', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: u.estado === 'Activo' ? '#22c55e' : '#ef4444' }}></span>
                    {u.estado}
                  </span>
                </div>

                {/* Info de contacto y puesto */}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(241, 245, 249, 0.6)', padding: '0.8rem', borderRadius: '8px', flex: 1 }}>
                  <div className="flex items-center gap-2">
                    <Mail size={14} color="var(--primary)" /> {u.correo || 'Sin correo registrado'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Building size={14} color="var(--primary)" /> {getPuestoNombre(u.puesto_id)}
                  </div>
                </div>

                {/* Botón de Acción: Cambiar Contraseña */}
                <button
                  className="btn"
                  style={{ padding: '0.45rem 0.8rem', fontSize: '0.8rem', background: '#eff6ff', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%', justifyContent: 'center', marginTop: '0.8rem', fontWeight: 'bold' }}
                  onClick={() => handleOpenChangePassModal(u)}
                >
                  <KeyRound size={14} /> Cambiar Contraseña
                </button>
              </div>
            );
          })}
          {filteredUsers.length === 0 && (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1' }}>
              <p className="text-text-muted">No se encontraron usuarios con los criterios de búsqueda.</p>
            </div>
          )}
        </div>
      )}

      {/* VISTA EN TABLA TRADICIONAL */}
      {viewMode === 'table' && (
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Personal</th>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Puesto de Salud</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const roleName = getPerfilNombre(u.perfil_id);
                  const styleConfig = ROLE_COLORS[roleName] || ROLE_COLORS['Administrador'];

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: styleConfig.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            {getInitials(u.nombre)}
                          </div>
                          <strong>{u.nombre}</strong>
                        </div>
                      </td>
                      <td>@{u.usuario}</td>
                      <td>{u.correo}</td>
                      <td>
                        <span style={{ background: styleConfig.badgeBg, color: styleConfig.badgeText, padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          {roleName}
                        </span>
                      </td>
                      <td>{getPuestoNombre(u.puesto_id)}</td>
                      <td>
                        <span className={`badge ${u.estado === 'Activo' ? 'badge-success' : 'badge-danger'}`}>
                          {u.estado}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#eff6ff', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'bold' }}
                          onClick={() => handleOpenChangePassModal(u)}
                        >
                          <KeyRound size={14} /> Cambiar Contraseña
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center">No hay usuarios registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVO USUARIO */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '500px' }}>
            <h2 className="flex items-center gap-2 mb-4">
              <User size={24} color="var(--primary)" /> Crear Nuevo Usuario de Personal
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Nombre Completo</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="input-field" placeholder="Ej. Lic. Franklin López" required />
              </div>
              <div className="flex gap-4">
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Nombre de Usuario</label>
                  <input type="text" name="usuario" value={formData.usuario} onChange={handleChange} className="input-field" placeholder="Ej. franl" required />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Contraseña</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} className="input-field" required />
                </div>
              </div>
              <div className="input-group">
                <label>Correo Electrónico</label>
                <input type="email" name="correo" value={formData.correo} onChange={handleChange} className="input-field" placeholder="ejemplo@salud.gob.gt" />
              </div>
              <div className="flex gap-4">
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Perfil (Rol)</label>
                  <select name="perfil_id" value={formData.perfil_id} onChange={handleChange} className="input-field" required>
                    <option value="">Seleccione...</option>
                    {perfiles.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Puesto de Salud</label>
                  <select name="puesto_id" value={formData.puesto_id} onChange={handleChange} className="input-field" required>
                    <option value="">Seleccione...</option>
                    {puestos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-between mt-4">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMINISTRADOR: CAMBIAR CONTRASEÑA DE CUALQUIER USUARIO */}
      {showChangePassModal && selectedUserForPass && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '450px' }}>
            <h3 className="flex items-center gap-2 mb-2" style={{ color: 'var(--primary)' }}>
              <KeyRound size={22} /> Cambiar Contraseña de Personal
            </h3>
            <p className="text-text-muted mb-4" style={{ fontSize: '0.9rem' }}>
              Actualizando la clave de acceso para: <strong>{selectedUserForPass.nombre}</strong> (<code>@{selectedUserForPass.usuario}</code>)
            </p>
            <form onSubmit={handleSaveNewPassword}>
              <div className="input-group">
                <label>Nueva Contraseña para el Usuario</label>
                <input
                  type="password"
                  className="input-field"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Escriba la nueva contraseña..."
                  minLength="4"
                  required
                />
              </div>
              <div className="flex justify-between mt-4">
                <button type="button" className="btn" onClick={() => setShowChangePassModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={18} /> Actualizar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
