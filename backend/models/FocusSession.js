const mongoose = require('mongoose');

const focusSessionSchema = new mongoose.Schema({
  startTime: Date,
  endTime: Date,
  duration: Number, // in minutes
  distractionTime: Number, // in seconds
}, { timestamps: true });

module.exports = mongoose.model('FocusSession', focusSessionSchema);
