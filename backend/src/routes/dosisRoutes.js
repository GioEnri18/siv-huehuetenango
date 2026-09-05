const express = require('express');
const router = express.Router();
const dosisController = require('../controllers/dosisController');
const { verificarToken, verificarRol } = require('../middleware/auth');

// Rutas protegidas (requieren token)
router.use(verificarToken);

// Solo el Enfermero y Administrador pueden registrar o anular dosis
router.post('/', verificarRol(['Enfermero', 'Administrador']), dosisController.registrarDosis);
router.post('/registrar', verificarRol(['Enfermero', 'Administrador']), dosisController.registrarDosis);
router.put('/:id/anular', verificarRol(['Enfermero', 'Administrador']), dosisController.anularDosis);
router.delete('/:id', verificarRol(['Enfermero', 'Administrador']), dosisController.anularDosis);

// Cualquier rol autenticado puede ver el listado de dosis aplicadas
router.get('/', dosisController.listarDosisAplicadas);
router.get('/nino/:nino_id', dosisController.obtenerDosisPorNino);

module.exports = router;

