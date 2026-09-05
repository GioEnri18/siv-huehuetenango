const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const tokenHeader = req.header('Authorization');
  if (!tokenHeader) {
    return res.status(401).json({ mensaje: 'Acceso denegado. No se proporcionó token.' });
  }

  // Formato esperado: "Bearer <token>"
  const token = tokenHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ mensaje: 'Acceso denegado. Formato de token inválido.' });
  }

  try {
    const decodificado = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decodificado;
    next();
  } catch (error) {
    res.status(400).json({ mensaje: 'Token inválido.' });
  }
};

const verificarRol = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ mensaje: 'No autenticado.' });
    }
    // Asumimos que el payload del JWT incluye el nombre del perfil
    if (!rolesPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({ mensaje: 'Acceso prohibido. No tienes el rol necesario.' });
    }
    next();
  };
};

module.exports = {
  verificarToken,
  verificarRol
};
