// models/Barter.ts
import mongoose from "mongoose";

const barterSchema = new mongoose.Schema({
  productOfferedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  productRequestedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  offeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  requestedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  offeredProductPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  requestedProductPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "declined"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

barterSchema.index({ offeredBy: 1, createdAt: -1 });
barterSchema.index({ requestedFrom: 1, createdAt: -1 });
barterSchema.index({ status: 1 });

export default mongoose.model("Barter", barterSchema);
