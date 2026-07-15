const StockMovement = require("../models/StockMovement");
const Products = require("../models/Products");

// Kept in sync with routes/chat.js `getStockStatus` and
// controllers/ProductsCon.js (see server/CLAUDE.md).
const getStockStatus = (quantity) => {
  if (quantity === 0) return "out-of-stock";
  if (quantity <= 10) return "low-stock";
  return "in-stock";
};

// shared field list for the incoming/outgoing/returns list endpoints —
// keep in sync with what those tables actually render
const MOVEMENT_LIST_FIELDS =
  "productId productName sku movementType quantity reference reason notes createdAt";

// builds the { movementType, $or: [...] } query used by getIncoming /
// getOutgoing / getReturns — `search` matches productName or sku
const buildMovementQuery = (movementType, search) => {
  const query = { movementType };
  if (search) {
    query.$or = [
      { productName: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
    ];
  }
  return query;
};

// fetches a paginated movement list + its total quantity in one shape,
// reused by getIncoming / getOutgoing / getReturns
const listMovementsByType = async (movementType, { search, page = 1, limit = 50 }) => {
  const skip = (page - 1) * limit;
  const query = buildMovementQuery(movementType, search);

  const [movements, total, totalQuantityAgg] = await Promise.all([
    StockMovement.find(query)
      .select(MOVEMENT_LIST_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    StockMovement.countDocuments(query),
    StockMovement.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$quantity" } } },
    ]),
  ]);

  return {
    type: movementType,
    total,
    totalQuantity: totalQuantityAgg[0]?.total || 0,
    movements,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / limit),
  };
};

// GET ALL STOCK MOVEMENTS
const getAllStockMovements = async (req, res, next) => {
  try {
    const { movementType, search, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const query = movementType ? { movementType } : {};
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }
    const movements = await StockMovement.find(query)
      .select(MOVEMENT_LIST_FIELDS)
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
    const { search, limit = 50, page = 1 } = req.query;
    const result = await listMovementsByType("incoming", { search, page, limit });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// GET OUTGOING STOCK
const getOutgoing = async (req, res, next) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    const result = await listMovementsByType("outgoing", { search, page, limit });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// GET RETURNED STOCK
const getReturns = async (req, res, next) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    const result = await listMovementsByType("return", { search, page, limit });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// GET STOCK LEVELS SUMMARY
const getStockLevelsSummary = async (req, res, next) => {
  try {
    const allProducts = await Products.find()
      .select("name sku quantity price status warehouse category")
      .lean();

    const inStock = allProducts.filter((p) => p.status === "in-stock").length;
    const lowStock = allProducts.filter((p) => p.status === "low-stock").length;
    const outOfStock = allProducts.filter(
      (p) => p.status === "out-of-stock",
    ).length;

    const totalQuantity = allProducts.reduce((sum, p) => sum + p.quantity, 0);
    const totalValue = allProducts.reduce(
      (sum, p) => sum + p.quantity * p.price,
      0,
    );

    const startOfThisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const productsAddedThisWeek = await Products.countDocuments({
      createdAt: { $gte: startOfThisWeek },
    });
    const [incomingThisWeek] = await StockMovement.aggregate([
      {
        $match: {
          movementType: "incoming",
          createdAt: { $gte: startOfThisWeek },
        },
      },
      { $group: { _id: null, quantity: { $sum: "$quantity" } } },
    ]);

    res.status(200).json({
      success: true,
      summary: {
        totalProducts: allProducts.length,
        inStock,
        lowStock,
        outOfStock,
        totalQuantity,
        totalValue,
        productsAddedThisWeek,
        unitsRestockedThisWeek: incomingThisWeek?.quantity || 0,
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

// shared by restockProduct / recordOutgoing / recordReturn — applies a
// signed quantity delta to a product, recomputes its status, and logs the
// matching StockMovement. `sign` is +1 for stock coming in (restock/return)
// or -1 for stock going out.
const adjustProductStock = async ({
  productId,
  quantity,
  sign,
  movementType,
  defaultReference,
  referenceType = "adjustment",
  reason,
  notes,
  createdBy,
}) => {
  const changeQuantity = Number(quantity);
  if (!productId || !changeQuantity || changeQuantity <= 0) {
    const err = new Error("productId and a positive quantity are required");
    err.statusCode = 400;
    throw err;
  }

  const product = await Products.findById(productId);
  if (!product) {
    const err = new Error("Product not found");
    err.statusCode = 404;
    throw err;
  }

  if (sign < 0 && changeQuantity > product.quantity) {
    const err = new Error(
      `Cannot remove ${changeQuantity} units — only ${product.quantity} in stock`,
    );
    err.statusCode = 400;
    throw err;
  }

  product.quantity += sign * changeQuantity;
  product.status = getStockStatus(product.quantity);
  await product.save();

  const movement = await StockMovement.create({
    productId: product._id,
    productName: product.name,
    sku: product.sku,
    movementType,
    quantity: changeQuantity,
    reference: defaultReference,
    referenceType,
    reason,
    notes,
    createdBy,
  });

  return { product, movement };
};

// RESTOCK A PRODUCT (increments quantity, recomputes status, logs the movement)
const restockProduct = async (req, res, next) => {
  try {
    const { productId, quantity, reference, notes, createdBy } = req.body;
    const { product, movement } = await adjustProductStock({
      productId,
      quantity,
      sign: 1,
      movementType: "incoming",
      defaultReference: reference || "Manual restock",
      notes,
      createdBy,
    });

    res.status(200).json({
      success: true,
      message: "Product restocked successfully",
      product,
      movement,
    });
  } catch (error) {
    if (error.statusCode) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    next(error);
  }
};

// RECORD MANUAL OUTGOING STOCK (decrements quantity — e.g. damage, sample,
// manual correction that isn't tied to a customer order)
const recordOutgoing = async (req, res, next) => {
  try {
    const { productId, quantity, reference, reason, notes, createdBy } = req.body;
    const { product, movement } = await adjustProductStock({
      productId,
      quantity,
      sign: -1,
      movementType: "outgoing",
      defaultReference: reference || "Manual stock-out",
      reason,
      notes,
      createdBy,
    });

    res.status(200).json({
      success: true,
      message: "Stock-out recorded successfully",
      product,
      movement,
    });
  } catch (error) {
    if (error.statusCode) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    next(error);
  }
};

// RECORD A CUSTOMER RETURN (increments quantity back into stock)
const recordReturn = async (req, res, next) => {
  try {
    const { productId, quantity, reference, reason, notes, createdBy } = req.body;
    const { product, movement } = await adjustProductStock({
      productId,
      quantity,
      sign: 1,
      movementType: "return",
      defaultReference: reference || "Customer return",
      referenceType: "return",
      reason,
      notes,
      createdBy,
    });

    res.status(200).json({
      success: true,
      message: "Return recorded successfully",
      product,
      movement,
    });
  } catch (error) {
    if (error.statusCode) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  getAllStockMovements,
  getIncoming,
  getOutgoing,
  getReturns,
  getStockLevelsSummary,
  restockProduct,
  recordOutgoing,
  recordReturn,
};
