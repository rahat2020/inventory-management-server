const Category = require("../models/Category");
const Products = require("../models/Products");
const AppError = require("../utils/AppError");

const addCategory = async (req, res, next) => {
  try {
    const existingCategory = await Category.findOne({ title: req.body.title });

    if (!req.body.title) {
      return res
        .status(409)
        .json({ success: false, message: "Title is required" });
    }
    if (!req.body.description) {
      return res
        .status(409)
        .json({ success: false, message: "Description is required" });
    }
    if (existingCategory) {
      return res
        .status(409)
        .json({ success: false, message: "Category already exists" });
    }

    const pd = await Category(req.body);
    const save = await pd.save();
    // res.status(200).json(save)
    res.status(200).json({
      success: true,
      message: "Category is created",
    });
  } catch (err) {
    next(
      new AppError(err.message || "Failed to get products", err.status || 500)
    );
  }
};

// get all categories
const getAllCategories = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Category.countDocuments(filter);

    const products = await Category.find(filter)
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
      new AppError(err.message || "Failed to get category", err.status || 500)
    );
  }
};

// get filter categories
const getFilterCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({}, "title _id"); // only fetch title and _id
    const formatted = categories.map((cat) => ({
      label: cat.title,
      value: cat._id,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    next(
      new AppError(err.message || "Failed to get categories", err.status || 500)
    );
  }
};

// get category by id
const categoryById = async (req, res, next) => {
  try {
    const isExistCategory = await Category.findById(params);
    if (!isExistCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    const articles = await Category.findById(req.params.id);
    res.status(200).json(articles);
  } catch (err) {
    next(
      new AppError(err.message || "Failed to get category", err.status || 500)
    );
  }
};

// update category
const updateCategory = async (req, res, next) => {
  const params = req.params.id;
  try {
    const isExistCategory = await Category.findById(params);
    if (!isExistCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    const articles = await Category.findByIdAndUpdate(
      params,
      { $set: req.body },
      { new: true }
    );
    articles &&
      res.status(200).json({
        success: true,
        message: "Category updated!",
      });
  } catch (err) {
    next(
      new AppError(err.message || "Failed to get category", err.status || 500)
    );
  }
};
// FILTER BY CATEGORY AND GET CATEGORY POSTS
const filterByCategory = async (req, res, next) => {
  try {
    const { category } = req.query;
    let posts;

    if (category) {
      posts = await Products.find({ category });
    } else {
      posts = await Products.find({});
    }

    res.json(posts);
    console.log(posts);
  } catch (err) {
    next(
      new AppError(err.message || "Failed to get category", err.status || 500)
    );
  }
};

// FILTER BY CATEGORY AND GET CATEGORY POSTS
const filterByCategoryVideos = async (req, res, next) => {
  try {
    const { category } = req.query;
    let posts;

    if (category) {
      posts = await Products.find({ category });
    } else {
      posts = await Products.find({});
    }

    res.json(posts);
    console.log(posts);
  } catch (err) {
    next(
      new AppError(err.message || "Failed to get category", err.status || 500)
    );
  }
  2;
};

const deleteCategory = async (req, res, next) => {
  const categoryId = req.params.id;
  try {
    const isExistCategory = await Category.findById(categoryId);
    if (!isExistCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found!",
      });
    }
    await Category.findByIdAndDelete(categoryId);
    res.status(200).json({
      success: true,
      message: "Category is deleted",
    });
  } catch (err) {
    console.log(err);
    next(
      new AppError(err.message || "Failed to get category", err.status || 500)
    );
  }
};

module.exports = {
  addCategory,
  getAllCategories,
  deleteCategory,
  categoryById,
  updateCategory,
  filterByCategory,
  filterByCategoryVideos,
  getFilterCategories,
};
