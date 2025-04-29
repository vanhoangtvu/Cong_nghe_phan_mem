const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const crypto = require("crypto");
const pkg = require("./package.json");
const Account = require("./models/account.js");

// App constants
const port = process.env.PORT || 5000;
const apiPrefix = "/api";

// MongoDB connection
mongoose.connect("mongodb://mongo:27017/budget", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Create Express app
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({ origin: /http:\/\/(127(\.\d){3}|localhost)/ }));
app.options("*", cors());

// Router setup
const router = express.Router();

// Info route
router.get("/", (req, res) => {
  res.send(`${pkg.description} v${pkg.version}`);
});

// Create account
router.post("/accounts", async (req, res) => {
  const { user, currency, description, balance } = req.body;

  if (!user || !currency) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const exists = await Account.findOne({ user });
  if (exists) {
    return res.status(409).json({ error: "User already exists" });
  }

  const acc = new Account({
    user,
    currency,
    description: description || `${user}'s budget`,
    balance: typeof balance === "number" ? balance : parseFloat(balance) || 0,
    transactions: [],
  });

  await acc.save();
  res.status(201).json(acc);
});

// Get account
router.get("/accounts/:user", async (req, res) => {
  const acc = await Account.findOne({ user: req.params.user });
  if (!acc) {
    return res.status(404).json({ error: "Nhap sai username roi ong oi" });
  }
  res.json(acc);
});

// Delete account
router.delete("/accounts/:user", async (req, res) => {
  const result = await Account.deleteOne({ user: req.params.user });
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: "User does not exist" });
  }
  res.sendStatus(204);
});

// Add transaction
router.post("/accounts/:user/transactions", async (req, res) => {
  const { date, object, amount } = req.body;
  const user = req.params.user;

  if (!date || !object || amount === undefined) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const acc = await Account.findOne({ user });
  if (!acc) {
    return res.status(404).json({ error: "User does not exist" });
  }

  const amt = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(amt)) {
    return res.status(400).json({ error: "Amount must be a number" });
  }

  const id = crypto
    .createHash("md5")
    .update(date + object + amt)
    .digest("hex");

  if (acc.transactions.some(tx => tx.id === id)) {
    return res.status(409).json({ error: "Transaction already exists" });
  }

  const transaction = { id, date, object, amount: amt };
  acc.transactions.push(transaction);
  acc.balance += amt;

  await acc.save();
  res.status(201).json(transaction);
});

// Delete transaction
router.delete("/accounts/:user/transactions/:id", async (req, res) => {
  const acc = await Account.findOne({ user: req.params.user });
  if (!acc) {
    return res.status(404).json({ error: "User does not exist" });
  }

  const index = acc.transactions.findIndex(tx => tx.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Transaction does not exist" });
  }

  const removed = acc.transactions.splice(index, 1)[0];
  acc.balance -= removed.amount;

  await acc.save();
  res.sendStatus(204);
});

// Add API prefix
app.use(apiPrefix, router);

// Start server
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});