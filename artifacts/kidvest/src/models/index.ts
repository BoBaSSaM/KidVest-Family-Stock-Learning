import mongoose, { Schema } from "mongoose";

// Separate collections keep identity/ownership queryable and indexed.
const base = { _id: { type: String, required: true } };
const userSchema = new Schema({
  ...base, name: String, email: String, username: String,
  identifier: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["parent", "kid"], required: true },
  parentId: { type: String, index: true }, age: Number, avatar: String,
  isDemo: Boolean, demoKey: { type: String, index: true }, notifications: Boolean,
  dailyLimit: Number, monthlyLimit: Number, completedLessons: [String], completedChallenges: [String],
  sandboxBalance: Number,
  sandboxHoldings: [{ _id: false, symbol: String, companyName: String, quantity: Number, avgBuyPrice: Number }],
  sandboxTrades: [{ _id: false, id: String, symbol: String, companyName: String, side: { type: String, enum: ["buy", "sell"] }, quantity: Number, price: Number, total: Number, createdAt: String }],
  revision: { type: Number, default: 0 },
  authVersion: { type: Number, default: 0, min: 0 }, createdAt: String,
}, { versionKey: false });
const walletSchema = new Schema({ ...base, parentId: { type: String, index: true }, kidId: { type: String, unique: true }, balance: Number, currency: String }, { versionKey: false });
const requestSchema = new Schema({
  ...base, parentId: { type: String, index: true }, kidId: { type: String, index: true },
  kidName: String, kidAvatar: String, symbol: String, companyName: String,
  quantity: Number, priceAtRequest: Number, priceAtApproval: Number, totalCost: Number,
  kidNote: String, parentComment: String, status: { type: String, index: true },
  type: String, source: String, createdAt: String, updatedAt: String,
}, { versionKey: false });
requestSchema.index({ parentId: 1, status: 1, createdAt: -1 });
const holdingSchema = new Schema({ ...base, parentId: { type: String, index: true }, kidId: String, symbol: String, companyName: String, quantity: Number, avgBuyPrice: Number }, { versionKey: false });
holdingSchema.index({ kidId: 1, symbol: 1 }, { unique: true });
const transactionSchema = new Schema({
  ...base, parentId: { type: String, index: true }, kidId: { type: String, index: true },
  kidName: String, amount: Number, type: String, status: String,
  createdAt: String, isDemo: Boolean, receiptUrl: String, stripeSessionId: String,
  symbol: String, quantity: Number, paymentProvider: String,
}, { versionKey: false });
transactionSchema.index({ stripeSessionId: 1 }, { unique: true, sparse: true });
const activitySchema = new Schema({ ...base, parentId: { type: String, index: true }, actorId: String, kidId: String, actorName: String, action: String, details: String, createdAt: String }, { versionKey: false });
activitySchema.index({ parentId: 1, createdAt: -1 });
const paymentSchema = new Schema({
  ...base, parentId: { type: String, index: true }, kidId: { type: String, index: true },
  amountCents: Number, stripeSessionId: String, requestId: String, quantity: Number,
  approvalPrice: Number, source: String, parentComment: String, status: String,
  approvalStatus: String, message: String, receiptUrl: String, createdAt: String, expiresAt: String,
}, { versionKey: false });
paymentSchema.index({ stripeSessionId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ parentId: 1, requestId: 1, status: 1 });
export const models = {
  users: mongoose.models.User || mongoose.model("User", userSchema),
  wallets: mongoose.models.Wallet || mongoose.model("Wallet", walletSchema),
  requests: mongoose.models.StockRequest || mongoose.model("StockRequest", requestSchema),
  holdings: mongoose.models.Holding || mongoose.model("Holding", holdingSchema),
  transactions: mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema),
  activity: mongoose.models.ActivityLog || mongoose.model("ActivityLog", activitySchema),
  paymentAttempts: mongoose.models.PaymentAttempt || mongoose.model("PaymentAttempt", paymentSchema),
};
