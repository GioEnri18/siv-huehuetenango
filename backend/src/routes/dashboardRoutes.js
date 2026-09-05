const express = require('express');
const router = express.Router();
const { getStats, getRecentActivities, scanRezago } = require('../controllers/dashboardController');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);
router.get('/stats', getStats);
router.get('/activities', getRecentActivities);
router.post('/scan-rezago', scanRezago);

module.exports = router;
