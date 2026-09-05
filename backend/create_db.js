const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function initDB() {
  const dbConfig = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'siv_huehuetenango',
        password: String(process.env.DB_PASSWORD || ''),
        port: process.env.DB_PORT || 5432,
      };

  // En entorno local (sin DATABASE_URL), intentar crear la BD si no existe
  if (!process.env.DATABASE_URL) {
    try {
      const clientMaster = new Client({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: 'template1',
        password: String(process.env.DB_PASSWORD || ''),
        port: process.env.DB_PORT || 5432,
      });
      await clientMaster.connect();
      await clientMaster.query('CREATE DATABASE ' + (process.env.DB_NAME || 'siv_huehuetenango')).catch(() => {});
      await clientMaster.end();
    } catch (e) {
      console.log('Paso de creación local omitido:', e.message);
    }
  }

  const clientApp = new Client(dbConfig);

  try {
    await clientApp.connect();
    console.log("Conectado exitosamente a la base de datos PostgreSQL.");

    let schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    }
    
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      console.log("Ejecutando schema.sql para inicializar tablas...");
      await clientApp.query(schemaSql);
      console.log("Tablas e índices creados / verificados exitosamente.");
    }
    
  } catch (err) {
    console.error("Error al ejecutar schema.sql:", err);
  } finally {
    await clientApp.end();
  }
}

initDB();
