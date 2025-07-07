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
      new AppError(err.message || "Failed to get products", err.status || 500)
    );
  }
};

const categoryById = async (req, res, next) => {
  try {
    const articles = await Category.findById(req.params.id);
    res.status(200).json(articles);
  } catch (err) {
    console.log(err);
    next(err);
  }
};
const updateCategory = async (req, res, next) => {
  const params = req.params.id;
  try {
    const articles = await Category.findByIdAndUpdate(
      params,
      { $set: req.body },
      { new: true }
    );
    articles && res.status(200).json("category updated");
  } catch (err) {
    console.log(err);
    next(err);
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
    next(err);
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
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.status(200).json("Category is deleted");
  } catch (err) {
    console.log(err);
    next(err);
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
};
