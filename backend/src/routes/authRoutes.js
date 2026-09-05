const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas públicas
router.post('/login', authController.login);
router.post('/register-admin', authController.registerAdmin);
router.post('/verify-code', authController.verifyCode);

module.exports = router;
