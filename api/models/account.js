const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  id: String,
  date: String,
  object: String,
  amount: Number,
});

const accountSchema = new mongoose.Schema({
  user: { type: String, required: true, unique: true },
  currency: String,
  description: String,
  balance: Number,
  transactions: [transactionSchema],
});

module.exports = mongoose.model("Account", accountSchema);
