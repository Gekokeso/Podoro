const mongoose = require('mongoose');

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: [true, 'El nombre es obligatorio'], trim: true },
    email: {
      type: String,
      required: [true, 'El correo es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: [true, 'La contraseña es obligatoria'] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);