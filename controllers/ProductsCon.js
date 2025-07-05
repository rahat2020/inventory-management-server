const Products = require("../models/Products");
const AppError = require("../utils/AppError");

// ADDING POSTS
const createProducts = async (req, res) => {
  try {
    const posts = await Products(req.body);
    const savedPosts = await posts.save();
    savedPosts &&
      res
        .status(200)
        .json({ success: true, message: "Product created successfully" });
  } catch (err) {
    if (err) {
      throw new AppError(err, err.status);
    }
  }
};

// UPDATE PRODUCT
const updateProduct = async (req, res) => {
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
    if (err) {
      throw new AppError(err, err.status);
    }
  }
};

// DELETE PRODUCT
const deleteProduct = async (req, res) => {
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
    if (err) {
      throw new AppError(err, err.status);
    }
  }
};

// GET ALL PRODUCT
const getAllProducts = async (req, res, next) => {
  try {
    const posts = await Products.find({});
    res.status(200).json(posts);
  } catch (err) {
    if (err) {
      throw new AppError(err, err.status);
    }
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
    if (err) {
      throw new AppError(err, err.status);
    }
  }
};

module.exports = {
  createProducts,
  updateProduct,
  deleteProduct,
  getProductByID,
  getAllProducts,
};
