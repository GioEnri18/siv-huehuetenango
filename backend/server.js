const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./src/config/db');
const cronJobs = require('./src/jobs/alertasCron');

const authRoutes = require('./src/routes/authRoutes');
const dosisRoutes = require('./src/routes/dosisRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const inventarioRoutes = require('./src/routes/inventarioRoutes');
const crearCrudController = require('./src/controllers/crudFactory');
const { verificarToken, verificarRol } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas API principales
app.use('/api/auth', authRoutes);
app.use('/api/dosis', dosisRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventario', inventarioRoutes);


// Endpoint PEPS (Primeras en Entrar, Primeras en Salir / Primero en Vencer)
app.get('/api/inventario/peps/:biologico_id', verificarToken, async (req, res) => {
  try {
    const { biologico_id } = req.params;
    const { puesto_id } = req.query;

    let result;
    if (puesto_id) {
      result = await db.query(`
        SELECT * FROM lote_inventario 
        WHERE biologico_id = $1 AND (puesto_id = $2 OR puesto_id IS NULL) AND estado = 'Activo' AND dosis_disponibles > 0 
        ORDER BY fecha_vencimiento ASC LIMIT 1
      `, [biologico_id, puesto_id]);
    }

    if (!result || result.rows.length === 0) {
      result = await db.query(`
        SELECT * FROM lote_inventario 
        WHERE biologico_id = $1 AND estado = 'Activo' AND dosis_disponibles > 0 
        ORDER BY fecha_vencimiento ASC LIMIT 1
      `, [biologico_id]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: 'No hay lotes disponibles en inventario' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al consultar PEPS:', error);
    res.status(500).json({ mensaje: 'Error al consultar lote PEPS' });
  }
});

// Configurar rutas CRUD genéricas para las tablas principales
const tablasCrud = ['usuario', 'nino', 'puesto_salud', 'perfil', 'tutor', 'biologico', 'esquema_dosis', 'alerta_rezago', 'incidente_dosis', 'lote_inventario'];
tablasCrud.forEach(tabla => {
  const controller = crearCrudController(tabla);
  const router = express.Router();
  router.use(verificarToken);

  if (tabla === 'alerta_rezago') {
    // Para alerta_rezago, calcular de forma automática en tiempo real antes de responder el listado
    router.get('/', async (req, res) => {
      try {
        await cronJobs.calcularAlertasRezago();
      } catch (e) {
        console.warn('Escaneo en tiempo real de rezago:', e.message);
      }
      return controller.listar(req, res);
    });
  } else {
    router.get('/', controller.listar);
  }

  router.get('/:id', controller.obtenerPorId);
  router.post('/', controller.crear);
  router.put('/:id', controller.actualizar);
  router.delete('/:id', verificarRol(['Administrador']), controller.eliminar);
  
  app.use(`/api/${tabla}`, router);
});

// Iniciar Cron / Motor de Alertas en segundo plano
cronJobs.iniciarCronAlertas();

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// Manejo de errores globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ mensaje: 'Ocurrió un error en el servidor.' });
});

const server = app.listen(PORT, () => {
  console.log(`Servidor de SIV Huehuetenango escuchando en el puerto ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`El puerto ${PORT} ya está en uso. Reintentando o utilizando servidor activo...`);
  } else {
    console.error('Error de servidor:', err);
  }
});
