const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres1:jhL2Sb4yWpkw1wayTvfqfyVpNBxZ8yny@dpg-dadqarid0e5s73duj82g-a.oregon-postgres.render.com/sivhuehuetenango';

async function testConnection() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Conectando a Render PostgreSQL...');
    await client.connect();
    console.log('✓ Conexión exitosa a la base de datos Render.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      console.log('Ejecutando schema.sql para inicializar la base de datos remota...');
      await client.query(schemaSql);
      console.log('✓ Tablas, índices y datos iniciales creados exitosamente en Render.');
    }
  } catch (err) {
    console.error('Error probando conexión:', err.message);
  } finally {
    await client.end();
  }
}

testConnection();
