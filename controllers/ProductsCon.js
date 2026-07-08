const Products = require("../models/Products");
const User = require("../models/User");
const AppError = require("../utils/AppError");

// Stock-status thresholds — kept in sync with routes/chat.js `getStockStatus`
// and the frontend's `getStatusBadgeClasses` (see server/CLAUDE.md).
const getStockStatus = (quantity) => {
  if (quantity === 0) return "out-of-stock";
  if (quantity <= 10) return "low-stock";
  return "in-stock";
};

// The app has no working auth session yet (see server/CLAUDE.md JWT gotcha),
// so product mutations from the UI can't supply a real `createdBy`. Fall back
// to the same idempotent seed user routes/chat.js's seedDemoInventory uses.
const getOrCreateDefaultUser = async () => {
  const seedUser = await User.findOneAndUpdate(
    { email: "inventory.seed@inventorypro.local" },
    {
      $setOnInsert: {
        username: "Inventory Seed User",
        email: "inventory.seed@inventorypro.local",
        password: "seeded-demo-user",
        role: "admin",
        isAdmin: true,
        terms: true,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return seedUser._id;
};

// ADDING POSTS
const createProducts = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    if (payload.quantity !== undefined) {
      payload.status = getStockStatus(Number(payload.quantity));
    }

    if (!payload.createdBy) {
      payload.createdBy = await getOrCreateDefaultUser();
    }

    const posts = await Products(payload);
    const savedPosts = await posts.save();
    savedPosts &&
      res.status(200).json({
        success: true,
        message: "Product created successfully",
        product: savedPosts,
      });
  } catch (err) {
    next(
      new AppError(err.message || "Failed to get products", err.status || 500)
    );
  }
};

// UPDATE PRODUCT
const updateProduct = async (req, res, next) => {
  try {
    const existingProduct = await Products.findById(req.params.id);

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Remove unchanged SKU (to avoid unique index check)
    const updatedFields = { ...req.body };
    if (updatedFields.sku === existingProduct.sku) {
      delete updatedFields.sku;
    }

    if (updatedFields.quantity !== undefined) {
      updatedFields.status = getStockStatus(Number(updatedFields.quantity));
    }

    const updatedProduct = await Products.findByIdAndUpdate(
      req.params.id,
      { $set: updatedFields },
      { new: true, runValidators: true }
    );

    updatedProduct &&
      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        updatedProduct,
      });
  } catch (err) {
    next(
      new AppError(err.message || "Failed to get products", err.status || 500)
    );
  }
};

// DELETE PRODUCT
const deleteProduct = async (req, res, next) => {
  try {
    const existingProduct = await Products.findById(req.params.id);

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updatedRes = await Products.findByIdAndDelete(req.params.id);
    updatedRes &&
      res
        .status(200)
        .json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    next(
      new AppError(err.message || "Failed to get products", err.status || 500)
    );
  }
};

// GET ALL PRODUCT
const getAllProducts = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Products.countDocuments(filter);

    const products = await Products.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 }); // newest first

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      data: products,
    });
  } catch (err) {
    next(
      new AppError(err.message || "Failed to get products", err.status || 500)
    );
  }
};

// GET PRODUCT BY ID
const getProductByID = async (req, res, next) => {
  const id = req.params.id;
  try {
    const post = await Products.findById(id);
    if (!id) {
      res.status(404).json({ message: "post not found" });
    }
    res.status(200).json(post);
  } catch (err) {
    next(
      new AppError(err.message || "Failed to get products", err.status || 500)
    );
  }
};

module.exports = {
  createProducts,
  updateProduct,
  deleteProduct,
  getProductByID,
  getAllProducts,
};
