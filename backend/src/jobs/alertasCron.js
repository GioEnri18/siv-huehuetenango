const cron = require('node-cron');
const db = require('../config/db');

/**
 * Calcula automáticamente y en tiempo real todas las alertas de rezago vacunal:
 * 1. Marca como 'Resuelta' cualquier alerta cuyo niño ya tenga registrada la vacuna.
 * 2. Examina niños activos contra el esquema recomendado por edad y genera o actualiza alertas de rezago.
 */
const calcularAlertasRezago = async () => {
  try {
    // 1. Auto-resolver alertas si la vacuna ya fue aplicada
    await db.query(`
      UPDATE alerta_rezago ar
      SET estado = 'Resuelta', actualizado_en = CURRENT_TIMESTAMP
      FROM dosis_aplicada da
      WHERE ar.nino_id = da.nino_id 
        AND ar.biologico_id = da.biologico_id 
        AND ar.estado IN ('Pendiente', 'En seguimiento')
        AND da.estado = 'Activo';
    `);

    // 2. Buscar rezagos faltantes
    const queryRezagos = `
      SELECT 
        n.id AS nino_id,
        ed.biologico_id,
        GREATEST(0, (CURRENT_DATE - n.fecha_nacimiento) - (ed.edad_meses_recomendada * 30)) AS dias_atraso,
        CASE 
          WHEN (CURRENT_DATE - n.fecha_nacimiento) - (ed.edad_meses_recomendada * 30) > 30 THEN 'Crítica'
          WHEN (CURRENT_DATE - n.fecha_nacimiento) - (ed.edad_meses_recomendada * 30) > 0 THEN 'Alta'
          WHEN (CURRENT_DATE - n.fecha_nacimiento) - (ed.edad_meses_recomendada * 30) >= -15 THEN 'Media'
          ELSE 'Baja'
        END AS prioridad
      FROM nino n
      CROSS JOIN esquema_dosis ed
      LEFT JOIN dosis_aplicada da 
        ON da.nino_id = n.id AND da.biologico_id = ed.biologico_id AND da.numero_dosis = ed.numero_dosis AND da.estado = 'Activo'
      WHERE 
        n.estado = 'Activo' 
        AND ed.estado = 'Activo'
        AND da.id IS NULL
        AND (CURRENT_DATE - n.fecha_nacimiento) >= ((ed.edad_meses_recomendada * 30) - 15);
    `;

    const rezagos = await db.query(queryRezagos);

    for (const r of rezagos.rows) {
      const existe = await db.query(
        `SELECT id FROM alerta_rezago WHERE nino_id = $1 AND biologico_id = $2 AND estado IN ('Pendiente', 'En seguimiento')`,
        [r.nino_id, r.biologico_id]
      );

      if (existe.rows.length > 0) {
        await db.query(
          `UPDATE alerta_rezago SET dias_atraso = $1, prioridad = $2, actualizado_en = CURRENT_TIMESTAMP WHERE id = $3`,
          [r.dias_atraso, r.prioridad, existe.rows[0].id]
        );
      } else {
        await db.query(
          `INSERT INTO alerta_rezago (nino_id, biologico_id, dias_atraso, prioridad, estado) VALUES ($1, $2, $3, $4, 'Pendiente')`,
          [r.nino_id, r.biologico_id, r.dias_atraso, r.prioridad]
        );
      }
    }
  } catch (error) {
    console.error('Error en generación automática de alertas de rezago:', error);
  }
};

const iniciarCronAlertas = () => {
  // Ejecutar cron cada 15 minutos en segundo plano
  cron.schedule('*/15 * * * *', () => {
    calcularAlertasRezago();
  });
  // Ejecución inmediata inicial al arrancar el servidor
  calcularAlertasRezago();
  console.log('✔ Motor de Alertas Automáticas de Rezago inicializado (Ejecución periódica y en tiempo real).');
};

module.exports = {
  iniciarCronAlertas,
  calcularAlertasRezago
};
