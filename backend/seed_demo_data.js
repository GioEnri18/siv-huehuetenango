const bcrypt = require('bcrypt');
const db = require('./src/config/db');

async function seedDemoData() {
  console.log('🌱 Iniciando la siembra de datos ficticios de prueba en SIV Huehuetenango...');

  try {
    const passHash = await bcrypt.hash('123456', 10);
    const adminPassHash = await bcrypt.hash('admin123', 10);

    // 1. PUESTOS DE SALUD
    console.log('1. Creando Puestos de Salud...');
    const resPuestos = await db.query(`
      INSERT INTO puesto_salud (nombre, municipio, comunidad) VALUES
      ('Sede Central', 'Huehuetenango', 'Centro'),
      ('Puesto de Salud Malacatancito', 'Malacatancito', 'Centro Malacatancito'),
      ('Puesto de salud zona 4', 'Huehuetenango', 'Zona 4'),
      ('Puesto de Salud Chiantla', 'Chiantla', 'Chiantla Centro'),
      ('Puesto de Salud San Pedro Necta', 'San Pedro Necta', 'Cabecera'),
      ('Puesto de Salud Santa Bárbara', 'Santa Bárbara', 'Santa Bárbara Centro')
      ON CONFLICT DO NOTHING
      RETURNING id, nombre;
    `);

    // Obtenemos los IDs de los puestos
    const puestosDB = await db.query('SELECT id, nombre FROM puesto_salud');
    const pMap = {};
    puestosDB.rows.forEach(p => { pMap[p.nombre] = p.id; });

    const pSede = pMap['Sede Central'] || 1;
    const pZona4 = pMap['Puesto de salud zona 4'] || 1;
    const pMala = pMap['Puesto de Salud Malacatancito'] || 1;
    const pChiantla = pMap['Puesto de Salud Chiantla'] || 1;
    const pSanPedro = pMap['Puesto de Salud San Pedro Necta'] || 1;

    // 2. PERFILES (ROLES)
    const perfilesDB = await db.query('SELECT id, nombre FROM perfil');
    const rMap = {};
    perfilesDB.rows.forEach(r => { rMap[r.nombre] = r.id; });

    const rAdmin = rMap['Administrador'] || 1;
    const rDirector = rMap['Director de Área'] || 2;
    const rEstad = rMap['Estadígrafo'] || 3;
    const rEnfer = rMap['Enfermero'] || 4;

    // 3. USUARIOS
    console.log('2. Creando Cuentas de Personal...');
    await db.query(`
      INSERT INTO usuario (nombre, usuario, correo, password_hash, perfil_id, puesto_id) VALUES
      ('Administrador del Sistema', 'admin', 'admin@siv.gt', '${adminPassHash}', ${rAdmin}, ${pSede}),
      ('Lic. Franklin López', 'FranE', 'franklin@salud.gob.gt', '${passHash}', ${rEnfer}, ${pZona4}),
      ('Dr. Giovanni Enríquez', 'gioenr18', 'gio@salud.gob.gt', '${passHash}', ${rDirector}, ${pMala}),
      ('Marvin Giovanni Ramírez', 'GiovanniAdmin', 'marvin@salud.gob.gt', '${adminPassHash}', ${rAdmin}, ${pZona4}),
      ('Enfermera Rosa Morales', 'EnfermeraRosa', 'rosa@salud.gob.gt', '${passHash}', ${rEnfer}, ${pChiantla}),
      ('Estadígrafo Pedro Cano', 'EstadigrafoPedro', 'pedro@salud.gob.gt', '${passHash}', ${rEstad}, ${pSanPedro})
      ON CONFLICT (usuario) DO NOTHING;
    `);

    const usersDB = await db.query('SELECT id, usuario FROM usuario');
    const uMap = {};
    usersDB.rows.forEach(u => { uMap[u.usuario] = u.id; });
    const userFranE = uMap['FranE'] || 1;

    // 4. TUTORES
    console.log('3. Creando Tutores / Madres Responsables...');
    const resTutores = await db.query(`
      INSERT INTO tutor (nombre, parentesco, telefono) VALUES
      ('María Elena López Gómez', 'Madre', '55123489'),
      ('Carlos Humberto Ramírez', 'Padre', '41239876'),
      ('Ana Isabel Morales', 'Madre', '58901234'),
      ('Rosa Marina Cano', 'Abuelo/a', '49876543'),
      ('Sofía Elizabeth Alvarado', 'Madre', '52341199'),
      ('Jorge Mario Vásquez', 'Padre', '47654321'),
      ('Elena Beatriz Castillo', 'Madre', '51122334'),
      ('Lucía Amanda Pérez', 'Tutor Legal', '40019283')
      RETURNING id, nombre;
    `);

    const tutoresList = resTutores.rows;

    // 5. NIÑOS (PACIENTES)
    console.log('4. Creando Pacientes Infantiles...');
    await db.query(`
      INSERT INTO nino (cui, nombres, apellidos, fecha_nacimiento, genero, comunidad, tutor_id, puesto_id) VALUES
      ('3001984750101', 'Liam Alexander', 'Ramírez López', '2026-01-15', 'M', 'Sector Zona 4', ${tutoresList[0]?.id || 1}, ${pZona4}),
      ('3002871620101', 'Valentina Sofía', 'Morales Ramírez', '2025-11-10', 'F', 'Cantón Central', ${tutoresList[1]?.id || 1}, ${pZona4}),
      ('3003765190101', 'Mateo Emanuel', 'Cano Alvarado', '2025-08-20', 'M', 'Aldea Chila', ${tutoresList[2]?.id || 1}, ${pMala}),
      ('3004654310101', 'Camila Victoria', 'Vásquez Morales', '2024-05-12', 'F', 'Chiantla Centro', ${tutoresList[3]?.id || 1}, ${pChiantla}),
      ('3005543210101', 'Gabriel Antonio', 'López Castillo', '2025-04-05', 'M', 'Malacatancito Centro', ${tutoresList[4]?.id || 1}, ${pMala}),
      ('3006432100101', 'Isabella María', 'Cano Pérez', '2024-10-30', 'F', 'San Pedro Necta Cabecera', ${tutoresList[5]?.id || 1}, ${pSanPedro}),
      ('3007321090101', 'Santiago Daniel', 'Ramírez Alvarado', '2026-03-01', 'M', 'Zona 1 Centro', ${tutoresList[6]?.id || 1}, ${pSede}),
      ('3008210980101', 'Lucía Fernanda', 'Morales López', '2025-01-25', 'F', 'Santa Bárbara', ${tutoresList[7]?.id || 1}, ${pZona4})
      ON CONFLICT (cui) DO NOTHING;
    `);

    const ninosDB = await db.query('SELECT id, cui, nombres, apellidos FROM nino');
    const ninosList = ninosDB.rows;

    // 6. DOSIS APLICADAS
    console.log('5. Registrando Inmunizaciones Aplicadas...');
    if (ninosList.length > 0) {
      await db.query(`
        INSERT INTO dosis_aplicada (nino_id, biologico_id, numero_dosis, fecha_aplicacion, lote, usuario_id, puesto_id) VALUES
        (${ninosList[0].id}, 1, 1, '2026-01-16', 'BCG-2026-A1', ${userFranE}, ${pZona4}),
        (${ninosList[0].id}, 2, 1, '2026-01-16', 'HEPB-2026-MIN', ${userFranE}, ${pZona4}),
        (${ninosList[0].id}, 3, 1, '2026-03-15', 'PENTA-2026-A', ${userFranE}, ${pZona4}),
        (${ninosList[0].id}, 4, 1, '2026-03-15', 'NEUMO-2026-L1', ${userFranE}, ${pZona4}),
        (${ninosList[0].id}, 5, 1, '2026-03-15', 'ROTA-2026-R1', ${userFranE}, ${pZona4}),
        
        (${ninosList[1].id}, 1, 1, '2025-11-11', 'BCG-2026-A1', ${userFranE}, ${pZona4}),
        (${ninosList[1].id}, 2, 1, '2025-11-11', 'HEPB-2026-MIN', ${userFranE}, ${pZona4}),
        (${ninosList[1].id}, 3, 1, '2026-01-10', 'PENTA-2026-A', ${userFranE}, ${pZona4}),
        (${ninosList[1].id}, 3, 2, '2026-03-10', 'PENTA-2026-A', ${userFranE}, ${pZona4}),
        
        (${ninosList[2].id}, 1, 1, '2025-08-21', 'BCG-2026-A1', ${userFranE}, ${pMala}),
        (${ninosList[2].id}, 2, 1, '2025-08-21', 'HEPB-2026-MIN', ${userFranE}, ${pMala}),
        (${ninosList[2].id}, 6, 1, '2026-08-20', 'SPR-2026-S1', ${userFranE}, ${pMala}),

        (${ninosList[3].id}, 1, 1, '2024-05-13', 'BCG-2026-A1', ${userFranE}, ${pChiantla}),
        (${ninosList[3].id}, 7, 1, '2025-11-12', 'DPT-2026-D1', ${userFranE}, ${pChiantla})
        ON CONFLICT DO NOTHING;
      `);
    }

    // 7. ALERTAS DE REZAGO
    console.log('6. Generando Alertas de Rezago...');
    if (ninosList.length > 2) {
      await db.query(`
        INSERT INTO alerta_rezago (nino_id, biologico_id, dias_atraso, prioridad, estado, creado_por) VALUES
        (${ninosList[1].id}, 4, 45, 'Crítica', 'Pendiente', ${userFranE}),
        (${ninosList[2].id}, 3, 25, 'Alta', 'Pendiente', ${userFranE}),
        (${ninosList[3].id}, 6, 15, 'Media', 'En seguimiento', ${userFranE}),
        (${ninosList[4]?.id || ninosList[0].id}, 2, 35, 'Alta', 'Pendiente', ${userFranE})
        ON CONFLICT DO NOTHING;
      `);
    }

    // 8. INCIDENTES DE DOSIS
    console.log('7. Registrando Reportes de Dosis Dañadas...');
    await db.query(`
      INSERT INTO incidente_dosis (biologico_id, lote, puesto_id, tipo_incidente, descripcion, cantidad_afectada, fecha_incidente, reportado_por, estado) VALUES
      (3, 'PENTA-2026-A', ${pZona4}, 'Ruptura de Cadena de Frío', 'Fallo eléctrico prolongado de 8 horas en refrigerador principal de la Zona 4.', 15, '2026-07-28', ${userFranE}, 'Activo'),
      (1, 'BCG-2026-A1', ${pMala}, 'Frasco Quebrado / Dañado', 'Caída accidental de frasco multidosis durante proceso de dilución.', 10, '2026-07-29', ${userFranE}, 'Activo'),
      (5, 'ROTA-2026-R1', ${pChiantla}, 'Vencimiento de Lote', 'Lote recibido con fecha próxima de caducidad no consumido a tiempo.', 8, '2026-07-25', ${userFranE}, 'Inactivo');
    `);

    // 9. LOTES E INVENTARIO INICIAL
    console.log('8. Registrando Lotes de Inventario e Ingresos...');
    await db.query(`
      INSERT INTO lote_inventario (biologico_id, codigo_lote, fecha_fabricacion, fecha_vencimiento, dosis_recibidas, dosis_disponibles, puesto_id, fabricante_proveedor, ubicacion_refrigeracion, estado) VALUES
      (1, 'BCG-2026-A1', '2025-10-01', '2027-04-30', 200, 180, ${pZona4}, 'PAHO / Serum Institute', 'Refrigerador A1', 'Activo'),
      (2, 'HEPB-2026-MIN', '2025-11-15', '2027-08-31', 150, 140, ${pZona4}, 'MSPAS Central', 'Refrigerador B2', 'Activo'),
      (3, 'PENTA-2026-A', '2025-12-01', '2026-11-30', 300, 260, ${pZona4}, 'Sanofi Pasteur', 'Cámara Fría Central', 'Activo'),
      (4, 'NEUMO-2026-L1', '2026-01-10', '2027-01-10', 250, 240, ${pZona4}, 'Pfizer Biologicals', 'Refrigerador A2', 'Activo'),
      (5, 'ROTA-2026-R1', '2025-09-01', '2026-10-15', 100, 80, ${pChiantla}, 'GlaxoSmithKline', 'Refrigerador 1', 'Activo'),
      (6, 'SPR-2026-S1', '2026-02-01', '2027-06-30', 120, 110, ${pMala}, 'PAHO Supply', 'Refrigerador M1', 'Activo')
      ON CONFLICT DO NOTHING;
    `);

    // 10. INGRESOS DE VACUNA CON TICKET
    console.log('9. Registrando Comprobantes/Tickets de Ingreso...');
    const lotesDB = await db.query('SELECT id, codigo_lote FROM lote_inventario');
    const lMap = {};
    lotesDB.rows.forEach(l => { lMap[l.codigo_lote] = l.id; });

    await db.query(`
      INSERT INTO ingreso_vacuna (numero_ticket, lote_id, biologico_id, codigo_lote, cantidad_dosis, cantidad_frascos, dosis_por_frasco, fecha_ingreso, fecha_vencimiento, proveedor_origen, documento_referencia, puesto_id, recibido_por, observaciones) VALUES
      ('TICK-ING-20260820-0001', ${lMap['BCG-2026-A1'] || 1}, 1, 'BCG-2026-A1', 200, 20, 10, '2026-08-20', '2027-04-30', 'Centro de Acopio Huehuetenango', 'Remisión #MSPAS-8841', ${pZona4}, ${userFranE}, 'Recepción en óptimas condiciones térmicas a +4°C.'),
      ('TICK-ING-20260821-0002', ${lMap['PENTA-2026-A'] || 3}, 3, 'PENTA-2026-A', 300, 30, 10, '2026-08-21', '2026-11-30', 'Almacén Central Guatemala', 'Factura #PAHO-904', ${pZona4}, ${userFranE}, 'Verificado sensor de cadena de frío continuo en transporte.')
      ON CONFLICT DO NOTHING;
    `);

    // 11. SALIDAS DE VACUNA
    console.log('10. Registrando Salidas y Egresos de Vacunas...');
    await db.query(`
      INSERT INTO salida_vacuna (numero_comprobante, lote_id, biologico_id, codigo_lote, cantidad_dosis, tipo_salida, puesto_destino_id, puesto_origen_id, fecha_salida, responsable_id, motivo_detalle) VALUES
      ('SAL-20260822-0001', ${lMap['ROTA-2026-R1'] || 5}, 5, 'ROTA-2026-R1', 12, 'Traslado', ${pSanPedro}, ${pChiantla}, '2026-08-22', ${userFranE}, 'Traslado urgente por demanda de vacunación en brigada itinerante San Pedro Necta.')
      ON CONFLICT DO NOTHING;
    `);


    console.log('\n=============================================================');
    console.log('🎉 ¡DATOS FICTICIOS DE PRUEBA CREADOS EXITOSAMENTE EN POSTGRESQL!');
    console.log('=============================================================');
    console.log('🔑 CUENTAS DISPONIBLES PARA PRUEBAS:');
    console.log('1. Administrador -> Usuario: admin | Contraseña: admin123');
    console.log('2. Enfermero     -> Usuario: FranE | Contraseña: 123456');
    console.log('3. Director Área -> Usuario: gioenr18 | Contraseña: 123456');
    console.log('4. Estadígrafo   -> Usuario: EstadigrafoPedro | Contraseña: 123456');
    console.log('=============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error al poblar datos ficticios:', error);
    process.exit(1);
  }
}

seedDemoData();
