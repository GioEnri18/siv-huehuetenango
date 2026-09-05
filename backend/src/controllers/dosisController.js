const db = require('../config/db');

const registrarDosis = async (req, res) => {
  const { nino_id, biologico_id, numero_dosis, fecha_aplicacion, lote, puesto_id, sincronizado } = req.body;
  const usuario_id = req.usuario.id;

  try {
    // Llamar al Stored Procedure para registrar la dosis aplicada
    const result = await db.query(`
      SELECT sp_registrar_dosis($1, $2, $3, $4, $5, $6, $7, $8) as id_dosis
    `, [nino_id, biologico_id, numero_dosis, fecha_aplicacion, lote, usuario_id, puesto_id, sincronizado || false]);

    // AUTO-RESOLVER ALERTAS DE REZAGO ASOCIADAS A ESTA VACUNA
    try {
      await db.query(`
        UPDATE alerta_rezago 
        SET estado = 'Resuelta', actualizado_en = CURRENT_TIMESTAMP 
        WHERE nino_id = $1 AND biologico_id = $2 AND estado IN ('Pendiente', 'En seguimiento')
      `, [nino_id, biologico_id]);
    } catch (eAlerta) {
      console.warn('Advertencia al resolver alerta automática:', eAlerta.message);
    }

    res.status(201).json({
      mensaje: 'Dosis registrada con éxito y alerta resuelta automáticamente',
      id_dosis: result.rows[0].id_dosis
    });
  } catch (error) {
    console.error('Error al registrar dosis:', error);
    res.status(400).json({ mensaje: error.message || 'Error al procesar la solicitud' });
  }
};

const listarDosisAplicadas = async (req, res) => {
  try {
    const isGlobalUser = req.usuario?.perfil === 'Director de Área' || !req.usuario?.puesto_id;
    const puestoId = req.usuario?.puesto_id;
    const params = (!isGlobalUser && puestoId) ? [puestoId] : [];

    let query = `
      SELECT d.*, b.nombre as vacuna, n.nombres, n.apellidos 
      FROM dosis_aplicada d
      JOIN biologico b ON d.biologico_id = b.id
      JOIN nino n ON d.nino_id = n.id
      WHERE d.estado = 'Activo'
    `;

    if (!isGlobalUser && puestoId) {
      query += ` AND d.puesto_id = $1`;
    }

    query += ` ORDER BY d.fecha_aplicacion DESC LIMIT 100`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar dosis aplicadas:', error);
    res.status(500).json({ mensaje: 'Error al obtener dosis aplicadas' });
  }
};

const obtenerDosisPorNino = async (req, res) => {
  const { nino_id } = req.params;
  try {
    const result = await db.query(`
      SELECT d.*, b.nombre as vacuna_nombre 
      FROM dosis_aplicada d
      JOIN biologico b ON d.biologico_id = b.id
      WHERE d.nino_id = $1 AND d.estado = 'Activo'
      ORDER BY d.fecha_aplicacion ASC, d.numero_dosis ASC
    `, [nino_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener dosis del niño:', error);
    res.status(500).json({ mensaje: 'Error al obtener dosis del paciente' });
  }
};

const anularDosis = async (req, res) => {
  const { id } = req.params;
  const usuario_id = req.usuario?.id || 1;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const resDosis = await client.query(
      `SELECT * FROM dosis_aplicada WHERE id = $1 AND estado = 'Activo'`,
      [id]
    );

    if (resDosis.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Dosis no encontrada o ya anulada.' });
    }

    const dosis = resDosis.rows[0];

    // Marcar dosis como Anulado
    await client.query(
      `UPDATE dosis_aplicada SET estado = 'Anulado', actualizado_en = CURRENT_TIMESTAMP, actualizado_por = $1 WHERE id = $2`,
      [usuario_id, id]
    );

    // Restaurar stock en inventario si aplica
    if (dosis.lote && dosis.biologico_id) {
      await client.query(
        `UPDATE lote_inventario 
         SET dosis_disponibles = dosis_disponibles + 1, estado = 'Activo', actualizado_en = CURRENT_TIMESTAMP
         WHERE codigo_lote = $1 AND biologico_id = $2 AND (puesto_id = $3 OR puesto_id IS NULL)`,
        [dosis.lote.trim(), dosis.biologico_id, dosis.puesto_id || 1]
      );
    }

    await client.query('COMMIT');

    // Recalcular alertas de rezago para el niño
    try {
      const cronJobs = require('../jobs/alertasCron');
      await cronJobs.calcularAlertasRezago();
    } catch (eCron) {
      console.warn('Advertencia al recalcular rezagos:', eCron.message);
    }

    res.json({ mensaje: 'Dosis anulada con éxito y stock/rezago actualizado.', id_dosis: parseInt(id) });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al anular dosis:', error);
    res.status(500).json({ mensaje: 'Error al anular la dosis.' });
  } finally {
    client.release();
  }
};

module.exports = {
  registrarDosis,
  listarDosisAplicadas,
  obtenerDosisPorNino,
  anularDosis
};
