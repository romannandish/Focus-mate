const mongoose = require("mongoose");

const journalSchema = new mongoose.Schema({
  text: { type: String, required: true },
  summary: { type: String },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Journal", journalSchema);
