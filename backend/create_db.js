const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function initDB() {
  // Conectarse a la base de datos por defecto 'postgres' para poder crear la nuestra
  const clientMaster = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'template1', // Nos conectamos a la por defecto (template1)
    password: String(process.env.DB_PASSWORD || ''),
    port: process.env.DB_PORT,
  });


  try {
    await clientMaster.connect();
    console.log("Conectado a PostgreSQL exitosamente.");

    // Intentar crear la base de datos (ignoramos el error si ya existe)
    try {
      await clientMaster.query('CREATE DATABASE ' + process.env.DB_NAME);
      console.log(`Base de datos '${process.env.DB_NAME}' creada con éxito.`);
    } catch (e) {
      if (e.code === '42P04') {
        console.log(`La base de datos '${process.env.DB_NAME}' ya existe, continuando...`);
      } else {
        throw e;
      }
    }
  } catch (err) {
    console.error("Error al conectar o crear la base de datos:", err);
    process.exit(1);
  } finally {
    await clientMaster.end();
  }

  // Ahora nos conectamos a la base de datos recién creada
  const clientApp = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: String(process.env.DB_PASSWORD || ''),
    port: process.env.DB_PORT,
  });


  try {
    await clientApp.connect();
    
    // Leemos el archivo schema.sql
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Ejecutamos todo el script
    console.log("Ejecutando schema.sql para crear tablas...");
    await clientApp.query(schemaSql);
    console.log("Tablas y datos iniciales creados exitosamente.");
    
  } catch (err) {
    console.error("Error al ejecutar schema.sql:", err);
  } finally {
    await clientApp.end();
  }
}

initDB();
