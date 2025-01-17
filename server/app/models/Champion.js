const mongoose = require('mongoose');

const Champion = new mongoose.Schema({
  name: String,
  infos: Array,
  roles: [String],
  lanes: [String],
  title: String,
  description: String,
  counters: [Number],
  id_ddragon: Number,
  icon: String,
});

module.exports = mongoose.model('Champion', Champion);
