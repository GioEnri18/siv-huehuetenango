const db = require('../config/db');

// Factory para generar controladores CRUD estándar rápidamente
const crearCrudController = (nombreTabla) => {
  return {
    listar: async (req, res) => {
      try {
        const isGlobalUser = req.usuario?.perfil === 'Director de Área' || !req.usuario?.puesto_id;
        const puestoId = req.usuario?.puesto_id;

        let query = `SELECT * FROM ${nombreTabla} WHERE estado = 'Activo'`;
        let params = [];

        if (!isGlobalUser && puestoId) {
          if (nombreTabla === 'puesto_salud') {
            query = `SELECT * FROM puesto_salud WHERE id = $1 AND estado = 'Activo'`;
            params = [puestoId];
          } else if (nombreTabla === 'nino') {
            query = `SELECT * FROM nino WHERE puesto_id = $1 AND estado = 'Activo'`;
            params = [puestoId];
          } else if (nombreTabla === 'usuario') {
            query = `SELECT * FROM usuario WHERE (puesto_id = $1 OR puesto_id IS NULL) AND estado != 'Anulado'`;
            params = [puestoId];
          } else if (nombreTabla === 'alerta_rezago') {
            query = `SELECT a.* FROM alerta_rezago a JOIN nino n ON a.nino_id = n.id WHERE n.puesto_id = $1 AND a.estado IN ('Pendiente', 'En seguimiento')`;
            params = [puestoId];
          } else if (nombreTabla === 'incidente_dosis') {
            query = `SELECT * FROM incidente_dosis WHERE puesto_id = $1 AND estado = 'Activo'`;
            params = [puestoId];
          } else if (nombreTabla === 'lote_inventario') {
            query = `SELECT * FROM lote_inventario WHERE (puesto_id = $1 OR puesto_id IS NULL) AND estado = 'Activo'`;
            params = [puestoId];
          }
        } else if (nombreTabla === 'usuario') {
          query = `SELECT * FROM usuario WHERE estado != 'Anulado'`;
        }

        const result = await db.query(query, params);
        res.json(result.rows);
      } catch (error) {
        console.error(`Error al listar ${nombreTabla}:`, error);
        res.status(500).json({ mensaje: `Error al obtener ${nombreTabla}` });
      }
    },
    obtenerPorId: async (req, res) => {
      try {
        const { id } = req.params;
        const result = await db.query(`SELECT * FROM ${nombreTabla} WHERE id = $1 AND estado = 'Activo'`, [id]);
        if (result.rows.length === 0) return res.status(404).json({ mensaje: 'No encontrado' });
        res.json(result.rows[0]);
      } catch (error) {
        res.status(500).json({ mensaje: 'Error interno' });
      }
    },
    crear: async (req, res) => {
      try {
        let body = { ...req.body };
        // Eliminar campos transitorios o de la UI que no pertenecen a la BD
        delete body.isOfflinePending;
        delete body.tempId;
        delete body.biologico_nombre;
        delete body.puesto_nombre;
        delete body.paciente_nombre;
        delete body.id;

        if (nombreTabla === 'usuario' && body.password_hash) {
          const bcrypt = require('bcrypt');
          body.password_hash = await bcrypt.hash(body.password_hash, 10);
        }

        if (nombreTabla === 'nino' && body.cui) {
          body.cui = String(body.cui).replace(/\s+/g, '').substring(0, 15);
        }
        
        // Asume que creado_por viene de req.usuario.id si está autenticado
        const creado_por = req.usuario ? req.usuario.id : null;
        
        const campos = Object.keys(body).join(', ') + ', creado_por';
        const valoresKeys = Object.keys(body).map((_, i) => `$${i + 1}`).join(', ') + `, $${Object.keys(body).length + 1}`;
        const valores = [...Object.values(body), creado_por];

        const result = await db.query(
          `INSERT INTO ${nombreTabla} (${campos}) VALUES (${valoresKeys}) RETURNING *`,
          valores
        );

        const nuevoRegistro = result.rows[0];

        // Sincronización automática de inventario cuando se reporta un incidente_dosis
        if (nombreTabla === 'incidente_dosis' && nuevoRegistro) {
          try {
            const { biologico_id, lote, cantidad_afectada, puesto_id, tipo_incidente, descripcion } = nuevoRegistro;
            const usuario_id = creado_por || 1;
            const cantDosis = parseInt(cantidad_afectada, 10) || 1;

            // 1. Buscar lote en inventario
            const resLote = await db.query(
              `SELECT id, dosis_disponibles FROM lote_inventario WHERE codigo_lote = $1 AND biologico_id = $2 LIMIT 1`,
              [lote.trim(), biologico_id]
            );

            let loteId = null;
            if (resLote.rows.length > 0) {
              loteId = resLote.rows[0].id;
              const actualDosis = resLote.rows[0].dosis_disponibles;
              const nuevoStock = Math.max(0, actualDosis - cantDosis);
              const nuevoEstado = nuevoStock === 0 ? 'Agotado' : 'Activo';

              await db.query(
                `UPDATE lote_inventario SET dosis_disponibles = $1, estado = $2 WHERE id = $3`,
                [nuevoStock, nuevoEstado, loteId]
              );
            }

            // 2. Generar registro automático en salida_vacuna
            const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randNum = Math.floor(1000 + Math.random() * 9000);
            const numeroComprobante = `SAL-INC-${hoy}-${randNum}`;

            const resSalida = await db.query(
              `INSERT INTO salida_vacuna (
                numero_comprobante, lote_id, biologico_id, codigo_lote, cantidad_dosis,
                tipo_salida, puesto_origen_id, fecha_salida, responsable_id, motivo_detalle,
                incidente_id, estado, creado_por, actualizado_por
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, $9, $10, 'Completado', $8, $8)
              RETURNING id`,
              [
                numeroComprobante,
                loteId,
                biologico_id,
                lote.trim(),
                cantDosis,
                tipo_incidente || 'Descarte/Dañada',
                puesto_id || 1,
                usuario_id,
                descripcion || `Reporte automático por incidente de dosis #${nuevoRegistro.id}`,
                nuevoRegistro.id
              ]
            );

            if (resSalida.rows.length > 0) {
              await db.query(
                `UPDATE incidente_dosis SET salida_id = $1, lote_id = $2 WHERE id = $3`,
                [resSalida.rows[0].id, loteId, nuevoRegistro.id]
              );
            }
          } catch (syncErr) {
            console.warn('Advertencia en sincronización de inventario para incidente:', syncErr.message);
          }
        }

        res.status(201).json(nuevoRegistro);
      } catch (error) {
        console.error(`Error al crear registro en ${nombreTabla}:`, error);
        res.status(400).json({ mensaje: 'Error al crear', detalle: error.message });
      }
    },
    actualizar: async (req, res) => {
      try {
        const { id } = req.params;
        let body = { ...req.body };
        if (nombreTabla === 'usuario' && body.password_hash) {
          const bcrypt = require('bcrypt');
          body.password_hash = await bcrypt.hash(body.password_hash, 10);
        }
        const actualizado_por = req.usuario ? req.usuario.id : null;

        const setString = Object.keys(body).map((key, i) => `${key} = $${i + 1}`).join(', ') + `, actualizado_por = $${Object.keys(body).length + 1}`;
        const valores = [...Object.values(body), actualizado_por, id];

        const result = await db.query(
          `UPDATE ${nombreTabla} SET ${setString} WHERE id = $${valores.length} RETURNING *`,
          valores
        );
        if (result.rows.length === 0) return res.status(404).json({ mensaje: 'No encontrado' });
        res.json(result.rows[0]);
      } catch (error) {
        res.status(400).json({ mensaje: 'Error al actualizar', detalle: error.message });
      }
    },
    eliminar: async (req, res) => {
      try {
        // Baja Lógica
        const { id } = req.params;
        const actualizado_por = req.usuario ? req.usuario.id : null;
        
        const result = await db.query(
          `UPDATE ${nombreTabla} SET estado = 'Anulado', actualizado_por = $1 WHERE id = $2 RETURNING *`,
          [actualizado_por, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ mensaje: 'No encontrado' });
        res.json({ mensaje: 'Eliminado correctamente (baja lógica)' });
      } catch (error) {
        res.status(500).json({ mensaje: 'Error al anular', detalle: error.message });
      }
    }
  };
};

module.exports = crearCrudController;
