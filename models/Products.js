const mongoose = require("mongoose");
const User = require("./User");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    cost: {
      type: Number,
      required: [true, "Cost is required"],
      min: [0, "Cost cannot be negative"],
    },
    unit: {
      type: String,
      enum: ["pcs", "kg", "liter", "box", "meter", "set", "pack"],
      default: "pcs",
    },
    image: {
      type: [String], // URL or local path
      default: [
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyFmBCFfrKGnUCXabdJm-oQmQ-fwUU23HOrlYVKqbA1njKWnjVvMAcFhcPYEzXm_ehfNg&usqp=CAU",
      ],
    },
    supplier: {
      name: { type: String, default: "" },
      contact: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["in-stock", "low-stock", "out-of-stock"],
      default: "in-stock",
    },
    warehouse: {
      type: String,
      default: "",
    },
    expiryDate: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // if you have a user model
      required: true,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt fields
  }
);

const Products = mongoose.model("Products", productSchema);

module.exports = Products;
