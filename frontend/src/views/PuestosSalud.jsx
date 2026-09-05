import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { Building, Plus, Edit2, Trash2, MapPin } from 'lucide-react';

const PuestosSalud = () => {
  const [puestos, setPuestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    municipio: 'Huehuetenango',
    comunidad: ''
  });

  const fetchPuestos = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/puesto_salud`);
      setPuestos(res.data);
    } catch (error) {
      console.error('Error al cargar puestos de salud:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPuestos();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenModal = (puesto = null) => {
    if (puesto) {
      setEditingId(puesto.id);
      setFormData({
        nombre: puesto.nombre,
        municipio: puesto.municipio,
        comunidad: puesto.comunidad
      });
    } else {
      setEditingId(null);
      setFormData({ nombre: '', municipio: 'Huehuetenango', comunidad: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/api/puesto_salud/${editingId}`, formData);
        alert('Puesto de Salud actualizado correctamente');
      } else {
        await axios.post(`${API_URL}/api/puesto_salud`, formData);
        alert('Puesto de Salud registrado correctamente');
      }
      setShowModal(false);
      fetchPuestos();
    } catch (error) {
      alert(error.response?.data?.mensaje || 'Error al guardar el Puesto de Salud');
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Está seguro de anular este Puesto de Salud?')) return;
    try {
      await axios.delete(`${API_URL}/api/puesto_salud/${id}`);
      fetchPuestos();
    } catch (error) {
      alert('Error al anular Puesto de Salud');
    }
  };

  if (loading) return <div>Cargando puestos de salud...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Gestión de Puestos de Salud</h1>
          <p className="text-text-muted">Centros de Salud oficiales en la red de Huehuetenango</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={20} /> Nuevo Puesto de Salud
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1rem' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre del Puesto</th>
                <th>Municipio</th>
                <th>Comunidad / Sector</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {puestos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.nombre}</strong>
                  </td>
                  <td>{p.municipio}</td>
                  <td>
                    <span className="flex items-center gap-1">
                      <MapPin size={16} color="var(--primary)" /> {p.comunidad}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-success">{p.estado}</span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn" style={{ padding: '0.4rem', background: '#e0f2fe', color: '#0369a1' }} onClick={() => handleOpenModal(p)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn" style={{ padding: '0.4rem', background: '#fee2e2', color: '#991b1b' }} onClick={() => handleEliminar(p.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {puestos.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">No hay puestos de salud registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '500px' }}>
            <h2 className="flex items-center gap-2 mb-4">
              <Building size={24} color="var(--primary)" /> {editingId ? 'Editar Puesto de Salud' : 'Crear Puesto de Salud'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Nombre del Puesto / Centro de Salud</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="input-field" placeholder="Ej. Puesto de Salud Chiantla Centro" required />
              </div>
              <div className="flex gap-4">
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Municipio</label>
                  <input type="text" name="municipio" value={formData.municipio} onChange={handleChange} className="input-field" required />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Comunidad / Cantón</label>
                  <input type="text" name="comunidad" value={formData.comunidad} onChange={handleChange} className="input-field" placeholder="Ej. Aldea San Antonio" required />
                </div>
              </div>
              <div className="flex justify-between mt-4">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Actualizar Puesto' : 'Guardar Puesto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuestosSalud;
