// backend/controllers/sitesController.js
const SiteRule = require('../models/siteRulesModel');

const getSites = async (req, res) => {
  res.status(200).json(await SiteRule.find({ user: req.user.id }));
};

const createSite = async (req, res) => {
  const { domain, mode, dailyLimitMinutes } = req.body;
  if (!domain) { res.status(400); throw new Error('Falta el dominio'); }

  const exists = await SiteRule.findOne({ user: req.user.id, domain });
  if (exists) { res.status(400); throw new Error('Ese sitio ya está registrado'); }

  const rule = await SiteRule.create({ user: req.user.id, domain, mode, dailyLimitMinutes });
  res.status(201).json(rule);
};

const updateSite = async (req, res) => {
  const rule = await SiteRule.findById(req.params.id);
  if (!rule) { res.status(404); throw new Error('Regla no encontrada'); }
  if (rule.user.toString() !== req.user.id) { res.status(401); throw new Error('No autorizado'); }

  res.status(200).json(await SiteRule.findByIdAndUpdate(req.params.id, req.body, { new: true }));
};

const deleteSite = async (req, res) => {
  const rule = await SiteRule.findById(req.params.id);
  if (!rule) { res.status(404); throw new Error('Regla no encontrada'); }
  if (rule.user.toString() !== req.user.id) { res.status(401); throw new Error('No autorizado'); }

  await rule.deleteOne();
  res.status(200).json({ id: req.params.id });
};

module.exports = { getSites, createSite, updateSite, deleteSite };