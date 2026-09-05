const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { verificarToken, verificarRol } = require('../middleware/auth');

// Todas las rutas de inventario requieren autenticación
router.use(verificarToken);

// Rutas de Ingreso de Vacunas y Ticket
router.post('/ingresos', verificarRol(['Enfermero', 'Estadígrafo', 'Administrador']), inventarioController.registrarIngreso);
router.get('/ingresos', inventarioController.listarIngresos);
router.get('/ingresos/:id/ticket', inventarioController.obtenerTicketIngreso);
router.put('/ingresos/:id/anular', verificarRol(['Enfermero', 'Estadígrafo', 'Administrador']), inventarioController.anularIngreso);
router.delete('/ingresos/:id', verificarRol(['Enfermero', 'Estadígrafo', 'Administrador']), inventarioController.anularIngreso);

// Rutas de Salida de Vacunas
router.post('/salidas', verificarRol(['Enfermero', 'Estadígrafo', 'Administrador']), inventarioController.registrarSalida);
router.post('/salidas/procesar-incidente/:incidente_id', verificarRol(['Enfermero', 'Estadígrafo', 'Administrador']), inventarioController.procesarSalidaDeIncidente);
router.get('/salidas', inventarioController.listarSalidas);
router.put('/salidas/:id/anular', verificarRol(['Enfermero', 'Estadígrafo', 'Administrador']), inventarioController.anularSalida);
router.delete('/salidas/:id', verificarRol(['Enfermero', 'Estadígrafo', 'Administrador']), inventarioController.anularSalida);
router.get('/incidentes-pendientes', inventarioController.listarIncidentesPendientes);

// Ruta de consulta de Stock de Lotes
router.get('/lotes', inventarioController.listarStockLotes);

module.exports = router;

