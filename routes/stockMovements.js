const express = require("express");
const router = express.Router();
const {
  getAllStockMovements,
  getIncoming,
  getOutgoing,
  getStockLevelsSummary,
} = require("../controllers/stockMovements");

// GET all stock movements
router.get("/stock-movements/all", getAllStockMovements);

// GET stock levels summary
router.get("/stock-movements/levels/summary", getStockLevelsSummary);

// GET incoming stock
router.get("/stock-movements/incoming", getIncoming);

// GET outgoing stock
router.get("/stock-movements/outgoing", getOutgoing);

module.exports = router;
