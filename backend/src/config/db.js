const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;

const config = process.env.DATABASE_URL 
  ? { 
      connectionString: process.env.DATABASE_URL, 
      ssl: { rejectUnauthorized: false } 
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: String(process.env.DB_PASSWORD || ''),
      port: process.env.DB_PORT,
      ...(isProduction && { ssl: { rejectUnauthorized: false } })
    };

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de base de datos', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};


