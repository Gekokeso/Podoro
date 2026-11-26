// backend/models/siteRulesModel.js
const mongoose = require('mongoose');

const siteRuleSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  domain: { type: String, required: true, lowercase: true, trim: true }, // "youtube.com"
  mode: { type: String, enum: ['limit', 'block'], default: 'limit' },
  dailyLimitMinutes: { type: Number, default: 30, min: 0 },
  enabled: { type: Boolean, default: true },
}, { timestamps: true });

siteRuleSchema.index({ user: 1, domain: 1 }, { unique: true });

module.exports = mongoose.model('SiteRule', siteRuleSchema);