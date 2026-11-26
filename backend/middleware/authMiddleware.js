const jwt = require('jsonwebtoken');
const User = require('../models/usersModel');

const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('No autorizado: falta el token');
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) throw new Error('Usuario inexistente');

    next();
  } catch (error) {
    res.status(401);
    throw new Error('No autorizado: token inválido o vencido');
  }
};

module.exports = { protect };