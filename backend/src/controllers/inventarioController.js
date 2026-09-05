const db = require('../config/db');

// Función aux para generar folios únicos
const generarFolioTicket = () => {
  const hoy = new Date();
  const fechaStr = hoy.toISOString().slice(0, 10).replace(/-/g, '');
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `TICK-ING-${fechaStr}-${randNum}`;
};

const generarFolioSalida = () => {
  const hoy = new Date();
  const fechaStr = hoy.toISOString().slice(0, 10).replace(/-/g, '');
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `SAL-${fechaStr}-${randNum}`;
};

// 1. REGISTRAR INGRESO DE VACUNA + TICKET
const registrarIngreso = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const {
      biologico_id,
      codigo_lote,
      cantidad_dosis,
      cantidad_frascos = 1,
      dosis_por_frasco = 1,
      fecha_fabricacion,
      fecha_vencimiento,
      proveedor_origen,
      ubicacion_refrigeracion,
      documento_referencia,
      puesto_id,
      observaciones
    } = req.body;

    const usuario_id = req.usuario?.id || 1;
    const puestoFinalId = puesto_id || req.usuario?.puesto_id || 1;

    if (!biologico_id || !codigo_lote || !cantidad_dosis || !fecha_vencimiento) {
      await client.query('ROLLBACK');
      return res.status(400).json({ mensaje: 'Los campos Biológico, Código de Lote, Cantidad de Dosis y Fecha de Vencimiento son obligatorios.' });
    }

    const numDosis = parseInt(cantidad_dosis, 10);
    if (isNaN(numDosis) || numDosis <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ mensaje: 'La cantidad de dosis debe ser un número entero positivo.' });
    }

    // 1. Verificar o crear en lote_inventario
    let loteId;
    const resExist = await client.query(
      `SELECT id, dosis_disponibles, dosis_recibidas FROM lote_inventario 
       WHERE codigo_lote = $1 AND biologico_id = $2 AND (puesto_id = $3 OR puesto_id IS NULL)`,
      [codigo_lote.trim(), biologico_id, puestoFinalId]
    );

    if (resExist.rows.length > 0) {
      loteId = resExist.rows[0].id;
      await client.query(
        `UPDATE lote_inventario 
         SET dosis_recibidas = dosis_recibidas + $1,
             dosis_disponibles = dosis_disponibles + $1,
             fecha_vencimiento = $2,
             fabricante_proveedor = COALESCE($3, fabricante_proveedor),
             ubicacion_refrigeracion = COALESCE($4, ubicacion_refrigeracion),
             estado = 'Activo',
             actualizado_en = CURRENT_TIMESTAMP,
             actualizado_por = $5
         WHERE id = $6`,
        [numDosis, fecha_vencimiento, proveedor_origen, ubicacion_refrigeracion, usuario_id, loteId]
      );
    } else {
      const resInsLote = await client.query(
        `INSERT INTO lote_inventario (
          biologico_id, codigo_lote, fecha_fabricacion, fecha_vencimiento, 
          dosis_recibidas, dosis_disponibles, puesto_id, fabricante_proveedor, 
          ubicacion_refrigeracion, estado, creado_por, actualizado_por
        ) VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, 'Activo', $9, $9) RETURNING id`,
        [
          biologico_id,
          codigo_lote.trim(),
          fecha_fabricacion || null,
          fecha_vencimiento,
          numDosis,
          puestoFinalId,
          proveedor_origen || 'PAHO / MSPAS',
          ubicacion_refrigeracion || 'Refrigerador de Almacén',
          usuario_id
        ]
      );
      loteId = resInsLote.rows[0].id;
    }

    // 2. Generar Ticket e Insertar Registro de Ingreso
    const numeroTicket = generarFolioTicket();
    const resIngreso = await client.query(
      `INSERT INTO ingreso_vacuna (
        numero_ticket, lote_id, biologico_id, codigo_lote, cantidad_dosis, 
        cantidad_frascos, dosis_por_frasco, fecha_ingreso, fecha_vencimiento, 
        proveedor_origen, documento_referencia, puesto_id, recibido_por, 
        observaciones, estado, creado_por, actualizado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, $9, $10, $11, $12, $13, 'Completado', $12, $12)
      RETURNING id`,
      [
        numeroTicket,
        loteId,
        biologico_id,
        codigo_lote.trim(),
        numDosis,
        cantidad_frascos || 1,
        dosis_por_frasco || 1,
        fecha_vencimiento,
        proveedor_origen || 'PAHO / MSPAS Central',
        documento_referencia || 'Comprobante de Recepción',
        puestoFinalId,
        usuario_id,
        observaciones || ''
      ]
    );

    const ingresoId = resIngreso.rows[0].id;
    await client.query('COMMIT');

    // 3. Obtener ticket formateado completo para la respuesta
    const ticketRes = await db.query(
      `SELECT 
        ing.id,
        ing.numero_ticket,
        ing.codigo_lote,
        ing.cantidad_dosis,
        ing.cantidad_frascos,
        ing.dosis_por_frasco,
        ing.fecha_ingreso,
        ing.fecha_vencimiento,
        ing.proveedor_origen,
        ing.documento_referencia,
        ing.observaciones,
        ing.creado_en,
        b.nombre AS biologico_nombre,
        p.nombre AS puesto_nombre,
        p.municipio AS puesto_municipio,
        u.nombre AS recibido_por_nombre,
        u.usuario AS recibido_por_usuario
       FROM ingreso_vacuna ing
       JOIN biologico b ON ing.biologico_id = b.id
       LEFT JOIN puesto_salud p ON ing.puesto_id = p.id
       LEFT JOIN usuario u ON ing.recibido_por = u.id
       WHERE ing.id = $1`,
      [ingresoId]
    );

    res.status(201).json({
      mensaje: 'Ingreso de vacunas registrado exitosamente.',
      ticket: ticketRes.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al registrar ingreso de vacuna:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al registrar el ingreso.' });
  } finally {
    client.release();
  }
};

// 2. LISTAR INGRESOS DE VACUNA (HISTORIAL)
const listarIngresos = async (req, res) => {
  try {
    const { puesto_id, biologico_id, fecha, busqueda } = req.query;
    const isGlobalUser = req.usuario?.perfil === 'Director de Área' || !req.usuario?.puesto_id;
    const puestoFiltro = (!isGlobalUser && req.usuario?.puesto_id) ? req.usuario.puesto_id : puesto_id;

    let query = `
      SELECT 
        ing.id,
        ing.numero_ticket,
        ing.codigo_lote,
        ing.cantidad_dosis,
        ing.cantidad_frascos,
        ing.dosis_por_frasco,
        ing.fecha_ingreso,
        ing.fecha_vencimiento,
        ing.proveedor_origen,
        ing.documento_referencia,
        ing.observaciones,
        ing.estado,
        ing.creado_en,
        b.id AS biologico_id,
        b.nombre AS biologico_nombre,
        p.id AS puesto_id,
        p.nombre AS puesto_nombre,
        u.nombre AS recibido_por_nombre
      FROM ingreso_vacuna ing
      JOIN biologico b ON ing.biologico_id = b.id
      LEFT JOIN puesto_salud p ON ing.puesto_id = p.id
      LEFT JOIN usuario u ON ing.recibido_por = u.id
      WHERE 1=1
    `;
    const params = [];

    if (puestoFiltro) {
      params.push(puestoFiltro);
      query += ` AND ing.puesto_id = $${params.length}`;
    }

    if (biologico_id) {
      params.push(biologico_id);
      query += ` AND ing.biologico_id = $${params.length}`;
    }

    if (fecha) {
      params.push(fecha);
      query += ` AND ing.fecha_ingreso = $${params.length}`;
    }

    if (busqueda) {
      params.push(`%${busqueda}%`);
      query += ` AND (ing.numero_ticket ILIKE $${params.length} OR ing.codigo_lote ILIKE $${params.length} OR ing.proveedor_origen ILIKE $${params.length})`;
    }

    query += ` ORDER BY ing.creado_en DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar ingresos:', error);
    res.status(500).json({ mensaje: 'Error al consultar historial de ingresos.' });
  }
};

// 3. OBTENER DETALLE DE TICKET DE INGRESO
const obtenerTicketIngreso = async (req, res) => {
  try {
    const { id } = req.params;
    const esNumero = !isNaN(parseInt(id, 10)) && String(parseInt(id, 10)) === String(id);
    
    const query = `
      SELECT 
        ing.id,
        ing.numero_ticket,
        ing.codigo_lote,
        ing.cantidad_dosis,
        ing.cantidad_frascos,
        ing.dosis_por_frasco,
        ing.fecha_ingreso,
        ing.fecha_vencimiento,
        ing.proveedor_origen,
        ing.documento_referencia,
        ing.observaciones,
        ing.creado_en,
        b.nombre AS biologico_nombre,
        p.nombre AS puesto_nombre,
        p.municipio AS puesto_municipio,
        p.comunidad AS puesto_comunidad,
        u.nombre AS recibido_por_nombre,
        u.usuario AS recibido_por_usuario,
        pd.cargo AS recibido_por_cargo
      FROM ingreso_vacuna ing
      JOIN biologico b ON ing.biologico_id = b.id
      LEFT JOIN puesto_salud p ON ing.puesto_id = p.id
      LEFT JOIN usuario u ON ing.recibido_por = u.id
      LEFT JOIN perfil_usuario_detalle pd ON u.id = pd.usuario_id
      WHERE ${esNumero ? 'ing.id = $1' : 'ing.numero_ticket = $1'}
    `;
    const result = await db.query(query, [id]);


    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Ticket de ingreso no encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener ticket:', error);
    res.status(500).json({ mensaje: 'Error al consultar ticket de ingreso.' });
  }
};

// 4. REGISTRAR SALIDA DE VACUNA (EGRESO / TRASLADO)
const registrarSalida = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const {
      lote_id,
      biologico_id,
      codigo_lote,
      cantidad_dosis,
      tipo_salida,
      puesto_destino_id,
      motivo_detalle
    } = req.body;

    const usuario_id = req.usuario?.id || 1;
    const puestoOrigenId = req.usuario?.puesto_id || 1;

    if (!lote_id || !cantidad_dosis || !tipo_salida) {
      await client.query('ROLLBACK');
      return res.status(400).json({ mensaje: 'El Lote, la Cantidad de Dosis y el Tipo de Salida son obligatorios.' });
    }

    const numDosisSalida = parseInt(cantidad_dosis, 10);
    if (isNaN(numDosisSalida) || numDosisSalida <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ mensaje: 'La cantidad a dar salida debe ser mayor a cero.' });
    }

    // 1. Consultar existencias actuales en lote_inventario
    const resLote = await client.query(
      `SELECT id, biologico_id, codigo_lote, dosis_disponibles, estado FROM lote_inventario WHERE id = $1 FOR UPDATE`,
      [lote_id]
    );

    if (resLote.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'El lote seleccionado no existe.' });
    }

    const loteActual = resLote.rows[0];

    if (loteActual.dosis_disponibles < numDosisSalida) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        mensaje: `No hay suficiente stock disponible. Stock actual del lote '${loteActual.codigo_lote}': ${loteActual.dosis_disponibles} dosis.`
      });
    }

    // 2. Descontar stock
    const nuevoStock = loteActual.dosis_disponibles - numDosisSalida;
    const nuevoEstado = nuevoStock === 0 ? 'Agotado' : 'Activo';

    await client.query(
      `UPDATE lote_inventario 
       SET dosis_disponibles = $1, estado = $2, actualizado_en = CURRENT_TIMESTAMP, actualizado_por = $3 
       WHERE id = $4`,
      [nuevoStock, nuevoEstado, usuario_id, lote_id]
    );

    // 3. Si la salida no es un traslado, registrar automáticamente un reporte de incidente_dosis (Vacuna Dañada / Merma)
    let incidenteId = null;
    if (tipo_salida !== 'Traslado') {
      const resInc = await client.query(
        `INSERT INTO incidente_dosis (
          biologico_id, lote, lote_id, puesto_id, tipo_incidente, 
          descripcion, cantidad_afectada, fecha_incidente, reportado_por, 
          estado, creado_por, actualizado_por
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, 'Activo', $8, $8) RETURNING id`,
        [
          biologico_id || loteActual.biologico_id,
          codigo_lote || loteActual.codigo_lote,
          lote_id,
          puestoOrigenId,
          tipo_salida,
          motivo_detalle || `Egreso registrado en inventario por ${tipo_salida}`,
          numDosisSalida,
          usuario_id
        ]
      );
      incidenteId = resInc.rows[0].id;
    }

    // 4. Registrar salida en tabla salida_vacuna vinculando el incidente_id si existe
    const numeroComprobante = generarFolioSalida();
    const resSalida = await client.query(
      `INSERT INTO salida_vacuna (
        numero_comprobante, lote_id, biologico_id, codigo_lote, cantidad_dosis,
        tipo_salida, puesto_destino_id, puesto_origen_id, fecha_salida, 
        responsable_id, motivo_detalle, incidente_id, estado, creado_por, actualizado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9, $10, $11, 'Completado', $9, $9)
      RETURNING id`,
      [
        numeroComprobante,
        lote_id,
        biologico_id || loteActual.biologico_id,
        codigo_lote || loteActual.codigo_lote,
        numDosisSalida,
        tipo_salida,
        puesto_destino_id || null,
        puestoOrigenId,
        usuario_id,
        motivo_detalle || '',
        incidenteId
      ]
    );

    const salidaId = resSalida.rows[0].id;
    if (incidenteId) {
      await client.query(`UPDATE incidente_dosis SET salida_id = $1 WHERE id = $2`, [salidaId, incidenteId]);
    }

    // Si es un traslado a otro puesto de salud, registrar o aumentar stock en puesto destino
    if (tipo_salida === 'Traslado' && puesto_destino_id) {
      const resDestinoLote = await client.query(
        `SELECT id FROM lote_inventario WHERE codigo_lote = $1 AND biologico_id = $2 AND puesto_id = $3`,
        [loteActual.codigo_lote, loteActual.biologico_id, puesto_destino_id]
      );

      if (resDestinoLote.rows.length > 0) {
        await client.query(
          `UPDATE lote_inventario SET dosis_disponibles = dosis_disponibles + $1, dosis_recibidas = dosis_recibidas + $1, estado = 'Activo' WHERE id = $2`,
          [numDosisSalida, resDestinoLote.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO lote_inventario (
            biologico_id, codigo_lote, fecha_vencimiento, dosis_recibidas, dosis_disponibles, 
            puesto_id, fabricante_proveedor, estado, creado_por, actualizado_por
          ) VALUES ($1, $2, CURRENT_DATE + INTERVAL '1 year', $3, $3, $4, 'Traslado Interno', 'Activo', $5, $5)`,
          [loteActual.biologico_id, loteActual.codigo_lote, numDosisSalida, puesto_destino_id, usuario_id]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Salida de vacunas registrada exitosamente.',
      salida_id: salidaId,
      incidente_id: incidenteId,
      numero_comprobante: numeroComprobante,
      stock_restante: nuevoStock
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al registrar salida de vacuna:', error);
    res.status(500).json({ mensaje: 'Error interno al registrar la salida.' });
  } finally {
    client.release();
  }
};

// 5. LISTAR SALIDAS DE VACUNA (HISTORIAL)
const listarSalidas = async (req, res) => {
  try {
    const { puesto_id, tipo_salida, busqueda } = req.query;
    const isGlobalUser = req.usuario?.perfil === 'Director de Área' || !req.usuario?.puesto_id;
    const puestoFiltro = (!isGlobalUser && req.usuario?.puesto_id) ? req.usuario.puesto_id : puesto_id;

    let query = `
      SELECT 
        sal.id,
        sal.numero_comprobante,
        sal.codigo_lote,
        sal.cantidad_dosis,
        sal.tipo_salida,
        sal.fecha_salida,
        sal.motivo_detalle,
        sal.incidente_id,
        sal.estado,
        sal.creado_en,
        b.id AS biologico_id,
        b.nombre AS biologico_nombre,
        p_ori.nombre AS puesto_origen_nombre,
        p_des.nombre AS puesto_destino_nombre,
        u.nombre AS responsable_nombre
      FROM salida_vacuna sal
      JOIN biologico b ON sal.biologico_id = b.id
      LEFT JOIN puesto_salud p_ori ON sal.puesto_origen_id = p_ori.id
      LEFT JOIN puesto_salud p_des ON sal.puesto_destino_id = p_des.id
      LEFT JOIN usuario u ON sal.responsable_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (puestoFiltro) {
      params.push(puestoFiltro);

      query += ` AND (sal.puesto_origen_id = $${params.length} OR sal.puesto_destino_id = $${params.length})`;
    }

    if (tipo_salida) {
      params.push(tipo_salida);
      query += ` AND sal.tipo_salida = $${params.length}`;
    }

    if (busqueda) {
      params.push(`%${busqueda}%`);
      query += ` AND (sal.numero_comprobante ILIKE $${params.length} OR sal.codigo_lote ILIKE $${params.length} OR sal.motivo_detalle ILIKE $${params.length})`;
    }

    query += ` ORDER BY sal.creado_en DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar salidas:', error);
    res.status(500).json({ mensaje: 'Error al consultar el historial de salidas.' });
  }
};

// 6. LISTAR STOCK / LOTES DISPONIBLES
const listarStockLotes = async (req, res) => {
  try {
    const { puesto_id, biologico_id, solo_activos } = req.query;
    const isGlobalUser = req.usuario?.perfil === 'Director de Área' || !req.usuario?.puesto_id;
    const puestoFiltro = (!isGlobalUser && req.usuario?.puesto_id) ? req.usuario.puesto_id : puesto_id;

    let query = `
      SELECT 
        lot.id,
        lot.codigo_lote,
        lot.fecha_fabricacion,
        lot.fecha_vencimiento,
        lot.dosis_recibidas,
        lot.dosis_disponibles,
        lot.fabricante_proveedor,
        lot.ubicacion_refrigeracion,
        lot.estado,
        b.id AS biologico_id,
        b.nombre AS biologico_nombre,
        p.id AS puesto_id,
        p.nombre AS puesto_nombre
      FROM lote_inventario lot
      JOIN biologico b ON lot.biologico_id = b.id
      LEFT JOIN puesto_salud p ON lot.puesto_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (puestoFiltro) {
      params.push(puestoFiltro);
      query += ` AND (lot.puesto_id = $${params.length} OR lot.puesto_id IS NULL)`;
    }

    if (biologico_id) {
      params.push(biologico_id);
      query += ` AND lot.biologico_id = $${params.length}`;
    }

    if (solo_activos === 'true') {
      query += ` AND lot.estado = 'Activo' AND lot.dosis_disponibles > 0`;
    }

    query += ` ORDER BY lot.fecha_vencimiento ASC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar stock de lotes:', error);
    res.status(500).json({ mensaje: 'Error al consultar stock de lotes.' });
  }
};

// 7. LISTAR INCIDENTES DE VACUNAS DAÑADAS PENDIENTES DE DAR SALIDA
const listarIncidentesPendientes = async (req, res) => {
  try {
    const { puesto_id } = req.query;
    const isGlobalUser = req.usuario?.perfil === 'Director de Área' || !req.usuario?.puesto_id;
    const puestoFiltro = (!isGlobalUser && req.usuario?.puesto_id) ? req.usuario.puesto_id : puesto_id;

    let query = `
      SELECT 
        inc.id,
        inc.biologico_id,
        inc.lote AS codigo_lote,
        inc.tipo_incidente,
        inc.descripcion,
        inc.cantidad_afectada,
        inc.fecha_incidente,
        inc.creado_en,
        b.nombre AS biologico_nombre,
        p.id AS puesto_id,
        p.nombre AS puesto_nombre,
        u.nombre AS reportado_por_nombre,
        lot.id AS lote_id,
        COALESCE(lot.dosis_disponibles, 0) AS stock_lote_actual
      FROM incidente_dosis inc
      JOIN biologico b ON inc.biologico_id = b.id
      LEFT JOIN puesto_salud p ON inc.puesto_id = p.id
      LEFT JOIN usuario u ON inc.reportado_por = u.id
      LEFT JOIN lote_inventario lot ON (inc.lote = lot.codigo_lote AND inc.biologico_id = lot.biologico_id AND (inc.puesto_id = lot.puesto_id OR lot.puesto_id IS NULL))
      WHERE inc.estado = 'Activo' AND inc.salida_id IS NULL
    `;
    const params = [];
    if (puestoFiltro) {
      params.push(puestoFiltro);
      query += ` AND inc.puesto_id = $${params.length}`;
    }

    query += ` ORDER BY inc.creado_en DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar incidentes pendientes:', error);
    res.status(500).json({ mensaje: 'Error al obtener incidentes pendientes de salida.' });
  }
};

// 8. PROCESAR SALIDA DE INVENTARIO DESDE UN REPORTE DE INCIDENTE DE DAÑO
const procesarSalidaDeIncidente = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { incidente_id } = req.params;
    const usuario_id = req.usuario?.id || 1;

    // 1. Obtener datos del incidente
    const resInc = await client.query(
      `SELECT * FROM incidente_dosis WHERE id = $1 FOR UPDATE`,
      [incidente_id]
    );

    if (resInc.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'El reporte de incidente especificado no existe.' });
    }

    const incidente = resInc.rows[0];

    if (incidente.salida_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ mensaje: 'Este reporte de vacuna dañada ya fue egresado del inventario anteriormente.' });
    }

    const numDosisDano = parseInt(incidente.cantidad_afectada, 10) || 1;
    const puestoOrigenId = incidente.puesto_id || req.usuario?.puesto_id || 1;

    // 2. Buscar lote en lote_inventario
    const resLote = await client.query(
      `SELECT id, dosis_disponibles, estado FROM lote_inventario 
       WHERE codigo_lote = $1 AND biologico_id = $2 AND (puesto_id = $3 OR puesto_id IS NULL)
       ORDER BY dosis_disponibles DESC LIMIT 1 FOR UPDATE`,
      [incidente.lote.trim(), incidente.biologico_id, puestoOrigenId]
    );

    let loteId = null;
    let nuevoStock = 0;

    if (resLote.rows.length > 0) {
      loteId = resLote.rows[0].id;
      const stockActual = resLote.rows[0].dosis_disponibles;
      nuevoStock = Math.max(0, stockActual - numDosisDano);
      const nuevoEstado = nuevoStock === 0 ? 'Agotado' : 'Activo';

      await client.query(
        `UPDATE lote_inventario SET dosis_disponibles = $1, estado = $2, actualizado_en = CURRENT_TIMESTAMP, actualizado_por = $3 WHERE id = $4`,
        [nuevoStock, nuevoEstado, usuario_id, loteId]
      );
    }

    // 3. Registrar salida en salida_vacuna
    const numeroComprobante = generarFolioSalida();
    const resSalida = await client.query(
      `INSERT INTO salida_vacuna (
        numero_comprobante, lote_id, biologico_id, codigo_lote, cantidad_dosis,
        tipo_salida, puesto_origen_id, fecha_salida, responsable_id, motivo_detalle,
        incidente_id, estado, creado_por, actualizado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, $9, $10, 'Completado', $8, $8)
      RETURNING id`,
      [
        numeroComprobante,
        loteId,
        incidente.biologico_id,
        incidente.lote.trim(),
        numDosisDano,
        incidente.tipo_incidente || 'Descarte/Dañada',
        puestoOrigenId,
        usuario_id,
        incidente.descripcion || `Salida por reporte de vacuna dañada #${incidente.id}`,
        incidente.id
      ]
    );

    const salidaId = resSalida.rows[0].id;

    // 4. Marcar incidente como Resuelto / Salida procesada
    await client.query(
      `UPDATE incidente_dosis 
       SET salida_id = $1, lote_id = COALESCE(lote_id, $2), estado = 'Inactivo', actualizado_en = CURRENT_TIMESTAMP, actualizado_por = $3 
       WHERE id = $4`,
      [salidaId, loteId, usuario_id, incidente.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Salida por vacuna dañada registrada y stock descontado exitosamente.',
      salida_id: salidaId,
      incidente_id: incidente.id,
      numero_comprobante: numeroComprobante,
      stock_restante: nuevoStock
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al procesar salida por incidente:', error);
    res.status(500).json({ mensaje: 'Error interno al dar salida por reporte de daño.' });
  } finally {
    client.release();
  }
};

// 9. ANULAR TICKET DE INGRESO (Revertir Stock)
const anularIngreso = async (req, res) => {
  const { id } = req.params;
  const usuario_id = req.usuario?.id || 1;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const resIngreso = await client.query(
      `SELECT * FROM ingreso_vacuna WHERE id = $1 AND estado != 'Anulado'`,
      [id]
    );

    if (resIngreso.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Ticket de ingreso no encontrado o ya anulado.' });
    }

    const ingreso = resIngreso.rows[0];
    const cantDosis = ingreso.cantidad_dosis;

    if (ingreso.lote_id) {
      const resLote = await client.query(
        `SELECT id, dosis_recibidas, dosis_disponibles FROM lote_inventario WHERE id = $1`,
        [ingreso.lote_id]
      );

      if (resLote.rows.length > 0) {
        const lote = resLote.rows[0];
        const nuevasRecibidas = Math.max(0, lote.dosis_recibidas - cantDosis);
        const nuevasDisponibles = Math.max(0, lote.dosis_disponibles - cantDosis);
        const nuevoEstado = nuevasDisponibles === 0 ? 'Agotado' : 'Activo';

        await client.query(
          `UPDATE lote_inventario 
           SET dosis_recibidas = $1, dosis_disponibles = $2, estado = $3, actualizado_en = CURRENT_TIMESTAMP, actualizado_por = $4
           WHERE id = $5`,
          [nuevasRecibidas, nuevasDisponibles, nuevoEstado, usuario_id, lote.id]
        );
      }
    }

    await client.query(
      `UPDATE ingreso_vacuna SET estado = 'Anulado', actualizado_en = CURRENT_TIMESTAMP, actualizado_por = $1 WHERE id = $2`,
      [usuario_id, id]
    );

    await client.query('COMMIT');
    res.json({ mensaje: 'Ticket de ingreso anulado correctamente y stock revertido.', id: parseInt(id) });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al anular ingreso:', error);
    res.status(500).json({ mensaje: 'Error al anular el ticket de ingreso.' });
  } finally {
    client.release();
  }
};

// 10. ANULAR COMPROBANTE DE SALIDA (Devolver Stock a Inventario)
const anularSalida = async (req, res) => {
  const { id } = req.params;
  const usuario_id = req.usuario?.id || 1;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const resSalida = await client.query(
      `SELECT * FROM salida_vacuna WHERE id = $1 AND estado != 'Anulado'`,
      [id]
    );

    if (resSalida.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Comprobante de salida no encontrado o ya anulado.' });
    }

    const salida = resSalida.rows[0];
    const cantDosis = salida.cantidad_dosis;

    if (salida.lote_id) {
      const resLote = await client.query(
        `SELECT id, dosis_disponibles FROM lote_inventario WHERE id = $1`,
        [salida.lote_id]
      );

      if (resLote.rows.length > 0) {
        const lote = resLote.rows[0];
        const nuevasDisponibles = lote.dosis_disponibles + cantDosis;

        await client.query(
          `UPDATE lote_inventario 
           SET dosis_disponibles = $1, estado = 'Activo', actualizado_en = CURRENT_TIMESTAMP, actualizado_por = $2
           WHERE id = $3`,
          [nuevasDisponibles, usuario_id, lote.id]
        );
      }
    }

    if (salida.incidente_id) {
      await client.query(
        `UPDATE incidente_dosis SET salida_id = NULL, estado = 'Activo', actualizado_en = CURRENT_TIMESTAMP, actualizado_por = $1 WHERE id = $2`,
        [usuario_id, salida.incidente_id]
      );
    }

    await client.query(
      `UPDATE salida_vacuna SET estado = 'Anulado', actualizado_en = CURRENT_TIMESTAMP, actualizado_por = $1 WHERE id = $2`,
      [usuario_id, id]
    );

    await client.query('COMMIT');
    res.json({ mensaje: 'Comprobante de salida anulado correctamente y stock devuelto a inventario.', id: parseInt(id) });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al anular salida:', error);
    res.status(500).json({ mensaje: 'Error al anular el comprobante de salida.' });
  } finally {
    client.release();
  }
};

module.exports = {
  registrarIngreso,
  listarIngresos,
  obtenerTicketIngreso,
  anularIngreso,
  registrarSalida,
  listarSalidas,
  anularSalida,
  listarStockLotes,
  listarIncidentesPendientes,
  procesarSalidaDeIncidente
};

