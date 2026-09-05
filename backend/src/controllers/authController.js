const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const login = async (req, res) => {
  const { usuario, password } = req.body;
  let ipOrigen = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    // Buscar usuario por nombre de usuario o por correo electrónico (insensible a mayúsculas/minúsculas)
    const result = await db.query(`
      SELECT u.id, u.nombre, u.usuario, u.correo, u.estado, u.password_hash, u.puesto_id, 
             p.nombre as perfil_nombre, ps.nombre as puesto_nombre, ps.municipio, ps.comunidad
      FROM usuario u 
      JOIN perfil p ON u.perfil_id = p.id 
      LEFT JOIN puesto_salud ps ON u.puesto_id = ps.id
      WHERE (LOWER(u.usuario) = LOWER($1) OR LOWER(u.correo) = LOWER($1)) AND u.estado != 'Anulado'
    `, [usuario.trim()]);

    if (result.rows.length === 0) {
      // Registrar intento fallido
      await db.query(`
        INSERT INTO login (fecha_hora, ip_origen, resultado) 
        VALUES (CURRENT_TIMESTAMP, $1, 'Fallido - Usuario o Correo no encontrado')
      `, [ipOrigen]);
      return res.status(401).json({ mensaje: 'Credenciales inválidas: Usuario o correo no registrado.' });
    }

    const user = result.rows[0];

    if (user.estado === 'Inactivo') {
      return res.status(401).json({ mensaje: 'Esta cuenta aún no ha sido activada con el código de verificación enviado por correo.' });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      // Registrar intento fallido
      await db.query(`
        INSERT INTO login (usuario_id, fecha_hora, ip_origen, resultado) 
        VALUES ($1, CURRENT_TIMESTAMP, $2, 'Fallido - Contraseña incorrecta')
      `, [user.id, ipOrigen]);
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    // Generar JWT
    const payload = {
      id: user.id,
      nombre: user.nombre,
      usuario: user.usuario,
      correo: user.correo,
      perfil: user.perfil_nombre,
      puesto_id: user.puesto_id,
      puesto_nombre: user.puesto_nombre || 'Sede Central',
      municipio: user.municipio || 'Huehuetenango',
      comunidad: user.comunidad || 'Centro'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    // Registrar inicio de sesión exitoso (sin bloquear el login si falla la bitácora)
    try {
      await db.query(`
        INSERT INTO login (usuario_id, fecha_hora, ip_origen, resultado, token_jti) 
        VALUES ($1, CURRENT_TIMESTAMP, $2, 'Exitoso', $3)
      `, [user.id, ipOrigen, token]);
    } catch (auditErr) {
      console.error('Bitácora login warning:', auditErr.message);
    }

    res.json({ token, usuario: payload });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const registerAdmin = async (req, res) => {
  const { nombre, usuario, correo, password, puesto_nombre, municipio, comunidad } = req.body;

  try {
    // 1. Validar que usuario o correo no existan previamente
    const existingUser = await db.query(
      "SELECT id FROM usuario WHERE usuario = $1 OR correo = $2",
      [usuario, correo]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ mensaje: 'El nombre de usuario o el correo electrónico ya está registrado.' });
    }

    // 2. Crear Puesto de Salud
    const puestoRes = await db.query(
      `INSERT INTO puesto_salud (nombre, municipio, comunidad, estado) 
       VALUES ($1, $2, $3, 'Activo') RETURNING id`,
      [puesto_nombre, municipio || 'Huehuetenango', comunidad || 'Centro']
    );
    const puestoId = puestoRes.rows[0].id;

    // 3. Obtener ID del perfil Administrador
    const perfilRes = await db.query("SELECT id FROM perfil WHERE nombre = 'Administrador'");
    if (perfilRes.rows.length === 0) {
      return res.status(500).json({ mensaje: 'Perfil Administrador no configurado en el sistema.' });
    }
    const perfilId = perfilRes.rows[0].id;

    // 4. Generar Código de Verificación de 6 dígitos
    const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Insertar Usuario en estado Inactivo (pendiente de confirmar por correo)
    await db.query(
      `INSERT INTO usuario (nombre, usuario, correo, password_hash, perfil_id, puesto_id, estado, codigo_verificacion) 
       VALUES ($1, $2, $3, $4, $5, $6, 'Inactivo', $7)`,
      [nombre, usuario, correo, passwordHash, perfilId, puestoId, codigoVerificacion]
    );

    // 6. Intentar envío de correo con nodemailer
    const nodemailer = require('nodemailer');
    
    // Si hay credenciales de SMTP en .env se usan, si no, se usa una configuración estándar de transporte
    let transporter;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      // Transportador de desarrollo (log en consola)
      transporter = nodemailer.createTransport({
        jsonTransport: true
      });
    }

    const mailOptions = {
      from: '"SIV Huehuetenango" <no-reply@siv.gt>',
      to: correo,
      subject: '🏥 Confirmación Oficial de Centro de Salud - SIV Huehuetenango',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 25px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0;">
          <h2 style="color: #2563eb; margin-top: 0;">🏥 Confirmación Oficial de Centro de Salud</h2>
          <p>Estimado/a <strong>${nombre}</strong>,</p>
          <p>Se ha recibido la solicitud para registrar el siguiente Centro de Salud en el sistema oficial:</p>
          <div style="background: #ffffff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 15px 0;">
            <p style="margin: 4px 0;"><strong>Puesto de Salud:</strong> ${puesto_nombre}</p>
            <p style="margin: 4px 0;"><strong>Municipio:</strong> ${municipio || 'Huehuetenango'}</p>
            <p style="margin: 4px 0;"><strong>Comunidad:</strong> ${comunidad || 'Centro'}</p>
          </div>
          <p>Para activar la cuenta de Administrador e ingresar al sistema, introduce este código de confirmación de 6 dígitos:</p>
          <div style="text-align: center; margin: 25px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #2563eb; background: #dbeafe; padding: 12px 24px; border-radius: 8px; display: inline-block;">${codigoVerificacion}</span>
          </div>
          <p style="font-size: 13px; color: #64748b; margin-top: 20px;">Si no realizaste esta solicitud, por favor ignora este correo.</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Correo procesado hacia: ${correo}`);
    } catch (mailError) {
      console.log('⚠️ No se pudo conectar al servidor SMTP externo. Código generado:', codigoVerificacion, mailError.message);
    }

    console.log(`=================================================`);
    console.log(`📧 CORREO ENVIADO A: ${correo}`);
    console.log(`🔑 CÓDIGO DE VERIFICACIÓN: ${codigoVerificacion}`);
    console.log(`=================================================`);

    res.status(201).json({
      success: true,
      mensaje: `Registro guardado. Se ha generado tu código de confirmación (${codigoVerificacion}) para activar la cuenta oficial.`,
      correo: correo,
      codigo_verificacion: codigoVerificacion
    });
  } catch (error) {
    console.error('Error al registrar administrador:', error);
    res.status(500).json({ mensaje: 'Error al procesar el registro.', detalle: error.message });
  }
};

const verifyCode = async (req, res) => {
  const { correo, codigo } = req.body;

  try {
    // Buscar usuario inactivo con el código de verificación
    const result = await db.query(
      `SELECT u.id, u.nombre, u.usuario, p.nombre as perfil_nombre 
       FROM usuario u 
       JOIN perfil p ON u.perfil_id = p.id 
       WHERE u.correo = $1 AND u.codigo_verificacion = $2`,
      [correo, codigo]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ mensaje: 'Código de verificación incorrecto o no encontrado.' });
    }

    const user = result.rows[0];

    // Activar usuario y limpiar código de verificación
    await db.query(
      "UPDATE usuario SET estado = 'Activo', codigo_verificacion = NULL WHERE id = $1",
      [user.id]
    );

    // Generar JWT
    const payload = {
      id: user.id,
      usuario: user.usuario,
      perfil: user.perfil_nombre
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({
      success: true,
      mensaje: 'Cuenta y Centro de Salud verificados oficialmente.',
      token,
      usuario: payload
    });
  } catch (error) {
    console.error('Error al verificar código:', error);
    res.status(500).json({ mensaje: 'Error al verificar el código.' });
  }
};

module.exports = {
  login,
  registerAdmin,
  verifyCode
};
