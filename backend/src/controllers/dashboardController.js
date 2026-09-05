const db = require('../config/db');

const getStats = async (req, res) => {
  try {
    const isGlobalUser = req.usuario?.perfil === 'Director de Área' || !req.usuario?.puesto_id;
    const puestoId = req.usuario?.puesto_id;
    const params = (!isGlobalUser && puestoId) ? [puestoId] : [];

    let queryNinos = "SELECT COUNT(*) FROM nino WHERE estado = 'Activo'";
    let queryDosis = "SELECT COUNT(*) FROM dosis_aplicada WHERE estado = 'Activo'";
    let queryAlertasActivas = "SELECT COUNT(*) FROM alerta_rezago a JOIN nino n ON a.nino_id = n.id WHERE a.estado IN ('Pendiente', 'En seguimiento')";
    let queryAlertasCriticas = "SELECT COUNT(*) FROM alerta_rezago a JOIN nino n ON a.nino_id = n.id WHERE a.estado IN ('Pendiente', 'En seguimiento') AND a.prioridad = 'Crítica'";
    let queryIncidentes = "SELECT COUNT(*) FROM incidente_dosis WHERE estado = 'Activo'";
    let queryBCG = "SELECT COUNT(DISTINCT d.nino_id) FROM dosis_aplicada d JOIN nino n ON d.nino_id = n.id WHERE d.biologico_id = 1 AND d.estado = 'Activo'";

    if (!isGlobalUser && puestoId) {
      queryNinos += " AND puesto_id = $1";
      queryDosis += " AND puesto_id = $1";
      queryAlertasActivas += " AND n.puesto_id = $1";
      queryAlertasCriticas += " AND n.puesto_id = $1";
      queryIncidentes += " AND puesto_id = $1";
      queryBCG += " AND n.puesto_id = $1";
    }

    const totalNinos = await db.query(queryNinos, params);
    const totalDosis = await db.query(queryDosis, params);
    const alertasActivas = await db.query(queryAlertasActivas, params);
    const alertasCriticas = await db.query(queryAlertasCriticas, params);
    const incidentesActivos = await db.query(queryIncidentes, params);
    const ninosConBCG = await db.query(queryBCG, params);

    const countNinos = parseInt(totalNinos.rows[0].count);
    const countBCG = parseInt(ninosConBCG.rows[0].count);
    const cobertura = countNinos > 0 ? Math.round((countBCG / countNinos) * 100) : 0;

    let queryUltimasAlertas = `
      SELECT a.id, a.prioridad, a.dias_atraso, (n.nombres || ' ' || n.apellidos) as paciente_nombre, b.nombre as biologico_nombre
      FROM alerta_rezago a
      JOIN nino n ON a.nino_id = n.id
      JOIN biologico b ON a.biologico_id = b.id
      WHERE a.estado IN ('Pendiente', 'En seguimiento')
    `;

    if (!isGlobalUser && puestoId) {
      queryUltimasAlertas += ` AND n.puesto_id = $1`;
    }

    queryUltimasAlertas += `
      ORDER BY CASE a.prioridad WHEN 'Crítica' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Media' THEN 3 ELSE 4 END, a.dias_atraso DESC
      LIMIT 4
    `;

    const resAlertasPrio = await db.query(queryUltimasAlertas, params);

    res.json({
      totalNinos: countNinos,
      totalDosis: parseInt(totalDosis.rows[0].count),
      alertasActivas: parseInt(alertasActivas.rows[0].count),
      alertasCriticas: parseInt(alertasCriticas.rows[0].count),
      incidentesActivos: parseInt(incidentesActivos.rows[0].count),
      cobertura: cobertura,
      ultimasAlertas: resAlertasPrio.rows
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const getRecentActivities = async (req, res) => {
  try {
    const isGlobalUser = req.usuario?.perfil === 'Director de Área' || !req.usuario?.puesto_id;
    const puestoId = req.usuario?.puesto_id;
    const params = (!isGlobalUser && puestoId) ? [puestoId] : [];

    let query = `
      SELECT 'Dosis ' || b.nombre as accion, u.usuario as usuario, (n.nombres || ' ' || n.apellidos) as detalles, b.nombre as vacuna_nombre, d.lote, 'Completado' as estado, d.creado_en as fecha
      FROM dosis_aplicada d
      JOIN biologico b ON d.biologico_id = b.id
      JOIN usuario u ON d.creado_por = u.id
      LEFT JOIN nino n ON d.nino_id = n.id
      WHERE d.estado = 'Activo'
    `;

    if (!isGlobalUser && puestoId) {
      query += ` AND d.puesto_id = $1`;
    }

    query += ` ORDER BY d.creado_en DESC LIMIT 5`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener actividades:', error);
    res.status(500).json({ mensaje: 'Error interno' });
  }
};

const { calcularAlertasRezago } = require('../jobs/alertasCron');

const scanRezago = async (req, res) => {
  try {
    await calcularAlertasRezago();
    const countResult = await db.query("SELECT COUNT(*) FROM alerta_rezago WHERE estado IN ('Pendiente', 'En seguimiento')");
    res.json({
      success: true,
      mensaje: 'Escaneo manual de alertas de rezago completado exitosamente.',
      alertasActivas: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error al realizar escaneo manual de rezago:', error);
    res.status(500).json({ mensaje: 'Error al procesar el escaneo de rezagos.' });
  }
};

module.exports = {
  getStats,
  getRecentActivities,
  scanRezago
};
