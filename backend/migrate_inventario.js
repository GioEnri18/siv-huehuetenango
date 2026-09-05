const db = require('./src/config/db');

async function migrateInventario() {
  console.log('🔄 Ejecutando migración de tablas de inventario en PostgreSQL...');

  try {
    // 1. Lote Inventario
    await db.query(`
      CREATE TABLE IF NOT EXISTS lote_inventario (
        id SERIAL PRIMARY KEY,
        biologico_id INTEGER REFERENCES biologico(id),
        codigo_lote VARCHAR(100) NOT NULL,
        fecha_fabricacion DATE,
        fecha_vencimiento DATE NOT NULL,
        dosis_recibidas INTEGER NOT NULL DEFAULT 0,
        dosis_disponibles INTEGER NOT NULL DEFAULT 0,
        puesto_id INTEGER REFERENCES puesto_salud(id),
        fabricante_proveedor VARCHAR(150),
        ubicacion_refrigeracion VARCHAR(100),
        estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo','Agotado','Vencido','Anulado')),
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        creado_por INTEGER REFERENCES usuario(id),
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_por INTEGER REFERENCES usuario(id),
        CONSTRAINT unique_lote_puesto UNIQUE (codigo_lote, biologico_id, puesto_id)
      );
    `);

    // Añadir columnas a lote_inventario por si la tabla existía previamente en una versión parcial
    await db.query(`
      ALTER TABLE lote_inventario ADD COLUMN IF NOT EXISTS fecha_fabricacion DATE;
      ALTER TABLE lote_inventario ADD COLUMN IF NOT EXISTS dosis_recibidas INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE lote_inventario ADD COLUMN IF NOT EXISTS dosis_disponibles INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE lote_inventario ADD COLUMN IF NOT EXISTS fabricante_proveedor VARCHAR(150);
      ALTER TABLE lote_inventario ADD COLUMN IF NOT EXISTS ubicacion_refrigeracion VARCHAR(100);
      ALTER TABLE lote_inventario ADD COLUMN IF NOT EXISTS puesto_id INTEGER REFERENCES puesto_salud(id);
      ALTER TABLE lote_inventario ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE lote_inventario ADD COLUMN IF NOT EXISTS creado_por INTEGER REFERENCES usuario(id);
      ALTER TABLE lote_inventario ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE lote_inventario ADD COLUMN IF NOT EXISTS actualizado_por INTEGER REFERENCES usuario(id);
    `);

    // 2. Ingreso Vacuna
    await db.query(`
      CREATE TABLE IF NOT EXISTS ingreso_vacuna (
        id SERIAL PRIMARY KEY,
        numero_ticket VARCHAR(50) UNIQUE NOT NULL,
        lote_id INTEGER REFERENCES lote_inventario(id),
        biologico_id INTEGER REFERENCES biologico(id),
        codigo_lote VARCHAR(100) NOT NULL,
        cantidad_dosis INTEGER NOT NULL CHECK (cantidad_dosis > 0),
        cantidad_frascos INTEGER DEFAULT 1,
        dosis_por_frasco INTEGER DEFAULT 1,
        fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
        fecha_vencimiento DATE NOT NULL,
        proveedor_origen VARCHAR(150),
        documento_referencia VARCHAR(100),
        puesto_id INTEGER REFERENCES puesto_salud(id),
        recibido_por INTEGER REFERENCES usuario(id),
        observaciones TEXT,
        estado VARCHAR(20) DEFAULT 'Completado' CHECK (estado IN ('Completado','Anulado')),
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        creado_por INTEGER REFERENCES usuario(id),
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_por INTEGER REFERENCES usuario(id)
      );
    `);

    await db.query(`
      ALTER TABLE ingreso_vacuna ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE ingreso_vacuna ADD COLUMN IF NOT EXISTS creado_por INTEGER REFERENCES usuario(id);
      ALTER TABLE ingreso_vacuna ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE ingreso_vacuna ADD COLUMN IF NOT EXISTS actualizado_por INTEGER REFERENCES usuario(id);
    `);

    // 3. Salida Vacuna
    await db.query(`
      CREATE TABLE IF NOT EXISTS salida_vacuna (
        id SERIAL PRIMARY KEY,
        numero_comprobante VARCHAR(50) UNIQUE NOT NULL,
        lote_id INTEGER REFERENCES lote_inventario(id),
        biologico_id INTEGER REFERENCES biologico(id),
        codigo_lote VARCHAR(100) NOT NULL,
        cantidad_dosis INTEGER NOT NULL CHECK (cantidad_dosis > 0),
        tipo_salida VARCHAR(50) NOT NULL CHECK (tipo_salida IN ('Traslado', 'Vencimiento', 'Ruptura Cadena Frío', 'Ajuste de Inventario', 'Descarte/Dañada', 'Otro')),
        puesto_destino_id INTEGER REFERENCES puesto_salud(id),
        puesto_origen_id INTEGER REFERENCES puesto_salud(id),
        fecha_salida DATE NOT NULL DEFAULT CURRENT_DATE,
        responsable_id INTEGER REFERENCES usuario(id),
        motivo_detalle TEXT,
        incidente_id INTEGER REFERENCES incidente_dosis(id),
        estado VARCHAR(20) DEFAULT 'Completado' CHECK (estado IN ('Completado','Anulado')),
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        creado_por INTEGER REFERENCES usuario(id),
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_por INTEGER REFERENCES usuario(id)
      );
    `);

    // Añadir columnas de vinculación si la tabla ya existía
    await db.query(`
      ALTER TABLE salida_vacuna ADD COLUMN IF NOT EXISTS incidente_id INTEGER REFERENCES incidente_dosis(id);
      ALTER TABLE salida_vacuna ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE salida_vacuna ADD COLUMN IF NOT EXISTS creado_por INTEGER REFERENCES usuario(id);
      ALTER TABLE salida_vacuna ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE salida_vacuna ADD COLUMN IF NOT EXISTS actualizado_por INTEGER REFERENCES usuario(id);
      ALTER TABLE incidente_dosis ADD COLUMN IF NOT EXISTS salida_id INTEGER REFERENCES salida_vacuna(id);
      ALTER TABLE incidente_dosis ADD COLUMN IF NOT EXISTS lote_id INTEGER REFERENCES lote_inventario(id);
    `);



    console.log('✅ Migración de inventario completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

migrateInventario();
