const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/usersModel');

// Express 5 captura los errores de funciones async automáticamente.
// Con Express 4, envuelve cada controlador con express-async-handler.

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Respuesta uniforme: nunca incluye la contraseña
const userResponse = (user) => ({
  _id: user.id,
  name: user.name,
  email: user.email,
  token: generateToken(user._id),
});

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

// @desc    Registrar usuario
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Completa nombre, correo y contraseña');
  }
  if (!isValidEmail(email)) {
    res.status(400);
    throw new Error('El correo no es válido');
  }
  if (password.length < 6) {
    res.status(400);
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    res.status(400);
    throw new Error('Ya existe una cuenta con ese correo');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({ name, email, password: hashedPassword });
  res.status(201).json(userResponse(user));
};

// @desc    Iniciar sesión
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Escribe tu correo y contraseña');
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Mismo mensaje si falla el correo o la contraseña: no revela qué cuentas existen
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401);
    throw new Error('Correo o contraseña incorrectos');
  }

  res.status(200).json(userResponse(user));
};

// @desc    Datos del usuario autenticado
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
  res.status(200).json(req.user); // lo agrega authMiddleware (sin contraseña)
};

module.exports = { registerUser, loginUser, getMe };