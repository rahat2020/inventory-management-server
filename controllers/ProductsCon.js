const Products = require("../models/Products");
const AppError = require("../utils/AppError");

// ADDING POSTS
const createProducts = async (req, res, next) => {
  try {
    const posts = await Products(req.body);
    const savedPosts = await posts.save();
    savedPosts &&
      res
        .status(200)
        .json({ success: true, message: "Product created successfully" });
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

    const updatedProduct = await Products.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
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
