const express = require("express");
const router = express.Router();
const {
  getAllStockMovements,
  getIncoming,
  getOutgoing,
  getStockLevelsSummary,
  restockProduct,
} = require("../controllers/stockMovements");

// GET all stock movements
router.get("/stock-movements/all", getAllStockMovements);

// GET stock levels summary
router.get("/stock-movements/levels/summary", getStockLevelsSummary);

// GET incoming stock
router.get("/stock-movements/incoming", getIncoming);

// GET outgoing stock
router.get("/stock-movements/outgoing", getOutgoing);

// POST restock a product
router.post("/stock-movements/restock", restockProduct);

module.exports = router;
