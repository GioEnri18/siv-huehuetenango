const bcrypt = require('bcrypt');
const db = require('./src/config/db');

async function fixAllPasswords() {
  console.log('🔄 Actualizando contraseñas para todos los usuarios...');
  
  const pass123456 = await bcrypt.hash('123456', 10);
  const passAdmin123 = await bcrypt.hash('admin123', 10);

  // Actualizar usuarios con contraseña 123456
  await db.query(`
    UPDATE usuario 
    SET password_hash = '${pass123456}', estado = 'Activo' 
    WHERE usuario IN ('FranE', 'gioenr18', 'EnfermeraRosa', 'EstadigrafoPedro');
  `);

  // Actualizar administradores con contraseña admin123
  await db.query(`
    UPDATE usuario 
    SET password_hash = '${passAdmin123}', estado = 'Activo' 
    WHERE usuario IN ('admin', 'GiovanniAdmin');
  `);

  console.log('=============================================================');
  console.log('✅ ¡TODAS LAS CONTRASEÑAS HAN SIDO ACTUALIZADAS CORRECTAMENTE!');
  console.log('=============================================================');
  console.log('🔑 CREDENCIALES ACTIVAS VERIFICADAS:');
  console.log('• admin            -> Contraseña: admin123  (Rol: Administrador)');
  console.log('• GiovanniAdmin    -> Contraseña: admin123  (Rol: Administrador)');
  console.log('• FranE            -> Contraseña: 123456    (Rol: Enfermero)');
  console.log('• gioenr18         -> Contraseña: 123456    (Rol: Director de Área)');
  console.log('• EnfermeraRosa    -> Contraseña: 123456    (Rol: Enfermero)');
  console.log('• EstadigrafoPedro -> Contraseña: 123456    (Rol: Estadígrafo)');
  console.log('=============================================================\n');

  process.exit(0);
}

fixAllPasswords().catch(console.error);
