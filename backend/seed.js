const bcrypt = require('bcrypt');
const db = require('./src/config/db');

async function seedAdmin() {
  try {
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    // Primero, nos aseguramos de que exista un Puesto de Salud para el admin
    const puestoResult = await db.query(`
      INSERT INTO puesto_salud (nombre, municipio, comunidad) 
      VALUES ('Sede Central', 'Huehuetenango', 'Centro') 
      RETURNING id
    `);
    const puestoId = puestoResult.rows[0].id;

    // Buscamos el ID del perfil Administrador
    const perfilResult = await db.query("SELECT id FROM perfil WHERE nombre = 'Administrador'");
    if (perfilResult.rows.length === 0) {
      console.log("Error: No se encontró el perfil Administrador. Asegúrate de haber ejecutado schema.sql");
      process.exit(1);
    }
    const perfilId = perfilResult.rows[0].id;

    // Insertamos el usuario
    await db.query(`
      INSERT INTO usuario (nombre, usuario, correo, password_hash, perfil_id, puesto_id) 
      VALUES ('Administrador del Sistema', 'admin', 'admin@siv.gt', $1, $2, $3)
    `, [passwordHash, perfilId, puestoId]);

    console.log("=========================================");
    console.log("✅ Usuario Admin creado exitosamente.");
    console.log("👤 Usuario: admin");
    console.log("🔑 Contraseña: admin123");
    console.log("=========================================");
    process.exit(0);
  } catch (error) {
    if (error.code === '23505') {
      console.log("⚠️ El usuario admin ya existe en la base de datos.");
    } else {
      console.error("Error al crear admin:", error);
    }
    process.exit(1);
  }
}

seedAdmin();
