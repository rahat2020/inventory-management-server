const StockMovement = require("../models/StockMovement");
const Products = require("../models/Products");

// GET ALL STOCK MOVEMENTS
const getAllStockMovements = async (req, res, next) => {
  try {
    const { movementType, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const query = movementType ? { movementType } : {};
    const movements = await StockMovement.find(query)
      .select("productName sku movementType quantity reference createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await StockMovement.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      movements,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// GET INCOMING STOCK
const getIncoming = async (req, res, next) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const incoming = await StockMovement.find({ movementType: "incoming" })
      .select("productName sku quantity reference createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await StockMovement.countDocuments({
      movementType: "incoming",
    });
    const totalQuantity = await StockMovement.aggregate([
      { $match: { movementType: "incoming" } },
      { $group: { _id: null, total: { $sum: "$quantity" } } },
    ]);

    res.status(200).json({
      success: true,
      type: "incoming",
      total,
      totalQuantity: totalQuantity[0]?.total || 0,
      movements: incoming,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// GET OUTGOING STOCK
const getOutgoing = async (req, res, next) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const outgoing = await StockMovement.find({ movementType: "outgoing" })
      .select("productName sku quantity reference createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await StockMovement.countDocuments({
      movementType: "outgoing",
    });
    const totalQuantity = await StockMovement.aggregate([
      { $match: { movementType: "outgoing" } },
      { $group: { _id: null, total: { $sum: "$quantity" } } },
    ]);

    res.status(200).json({
      success: true,
      type: "outgoing",
      total,
      totalQuantity: totalQuantity[0]?.total || 0,
      movements: outgoing,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// GET STOCK LEVELS SUMMARY
const getStockLevelsSummary = async (req, res, next) => {
  try {
    const allProducts = await Products.find()
      .select("name sku quantity status warehouse category")
      .lean();

    const inStock = allProducts.filter((p) => p.status === "in-stock").length;
    const lowStock = allProducts.filter((p) => p.status === "low-stock").length;
    const outOfStock = allProducts.filter(
      (p) => p.status === "out-of-stock",
    ).length;

    const totalQuantity = allProducts.reduce((sum, p) => sum + p.quantity, 0);

    res.status(200).json({
      success: true,
      summary: {
        totalProducts: allProducts.length,
        inStock,
        lowStock,
        outOfStock,
        totalQuantity,
      },
      details: {
        inStockItems: allProducts.filter((p) => p.status === "in-stock"),
        lowStockItems: allProducts.filter((p) => p.status === "low-stock"),
        outOfStockItems: allProducts.filter((p) => p.status === "out-of-stock"),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllStockMovements,
  getIncoming,
  getOutgoing,
  getStockLevelsSummary,
};
