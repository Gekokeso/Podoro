// backend/models/usageModel.js
const mongoose = require('mongoose');

const usageSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  domain: { type: String, required: true },
  date: { type: String, required: true },   // "2026-11-11" (un documento por día)
  seconds: { type: Number, default: 0 },
});

usageSchema.index({ user: 1, domain: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Usage', usageSchema);