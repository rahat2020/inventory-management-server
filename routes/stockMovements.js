const express = require("express");
const router = express.Router();
const {
  getAllStockMovements,
  getIncoming,
  getOutgoing,
  getReturns,
  getStockLevelsSummary,
  restockProduct,
  recordOutgoing,
  recordReturn,
} = require("../controllers/stockMovements");

// GET all stock movements
router.get("/stock-movements/all", getAllStockMovements);

// GET stock levels summary
router.get("/stock-movements/levels/summary", getStockLevelsSummary);

// GET incoming stock
router.get("/stock-movements/incoming", getIncoming);

// GET outgoing stock
router.get("/stock-movements/outgoing", getOutgoing);

// GET returned stock
router.get("/stock-movements/returns", getReturns);

// POST restock a product
router.post("/stock-movements/restock", restockProduct);

// POST record manual outgoing stock (damage/sample/manual correction)
router.post("/stock-movements/stock-out", recordOutgoing);

// POST record a customer return
router.post("/stock-movements/return", recordReturn);

module.exports = router;
