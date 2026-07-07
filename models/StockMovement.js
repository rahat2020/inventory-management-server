const mongoose = require("mongoose");

const StockMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Products",
      required: true,
      index: true,
    },
    productName: String,
    sku: String,
    movementType: {
      type: String,
      enum: ["incoming", "outgoing", "adjustment", "return", "damage"],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    reference: {
      type: String,
      description: "Order/PO number or reference",
    },
    referenceId: mongoose.Schema.Types.ObjectId,
    referenceType: {
      type: String,
      enum: ["order", "purchase-order", "adjustment", "return"],
    },
    reason: String,
    fromLocation: String,
    toLocation: String,
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("StockMovement", StockMovementSchema);
