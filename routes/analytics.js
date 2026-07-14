const express = require("express");
const router = express.Router();
const {
  getAnalyticsOverview,
  getRestockForecast,
} = require("../controllers/analytics");

// GET analytics overview (order/payment mix, margin, category & product performance, top customers)
router.get("/analytics/overview", getAnalyticsOverview);

// GET restock forecast (sales-velocity-based reorder recommendations)
router.get("/analytics/forecast", getRestockForecast);

module.exports = router;
