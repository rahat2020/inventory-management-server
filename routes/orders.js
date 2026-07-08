const express = require("express");
const router = express.Router();
const {
  getAllOrders,
  getOrderById,
  getOrderStats,
  getSalesTrend,
  createOrder,
} = require("../controllers/orders");

// GET all orders
router.get("/orders/all", getAllOrders);

// GET order stats
router.get("/orders/stats/summary", getOrderStats);

// GET sales trend (for dashboard chart)
router.get("/orders/stats/trend", getSalesTrend);

// GET order by ID
router.get("/orders/:orderId", getOrderById);

// CREATE new order
router.post("/orders/create", createOrder);

module.exports = router;
