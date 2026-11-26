// backend/controllers/usageController.js
const Usage = require('../models/usageModel');

// La extensión llama aquí cada ~30s con { domain, date, seconds }
const addUsage = async (req, res) => {
  const { domain, date, seconds } = req.body;
  if (!domain || !date || !seconds) { res.status(400); throw new Error('Faltan datos'); }

  const usage = await Usage.findOneAndUpdate(
    { user: req.user.id, domain, date },
    { $inc: { seconds } },     // suma atómica, sin condiciones de carrera
    { upsert: true, new: true }
  );
  res.status(200).json(usage);
};

const getUsageByDate = async (req, res) => {
  res.status(200).json(await Usage.find({ user: req.user.id, date: req.params.date }));
};

module.exports = { addUsage, getUsageByDate };