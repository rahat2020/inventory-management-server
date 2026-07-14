const Orders = require("../models/Orders");
const Products = require("../models/Products");

// GET ANALYTICS OVERVIEW — aggregates order + inventory data into the
// breakdowns the Analytics page charts (order/payment status mix, margin,
// category & product performance, top customers). Kept as one endpoint
// since every section is a small aggregate and the page renders them together.
const getAnalyticsOverview = async (req, res, next) => {
  try {
    const statusAgg = await Orders.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const orderStatusBreakdown = statusAgg.map((s) => ({
      status: s._id,
      count: s.count,
    }));

    const paymentAgg = await Orders.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          amount: { $sum: "$totalAmount" },
        },
      },
    ]);
    const paymentStatusBreakdown = paymentAgg.map((p) => ({
      status: p._id,
      count: p.count,
      amount: p.amount,
    }));

    // per-product sales from order line items (price/cost are snapshotted
    // on the item at order time, so this reflects actual sold margin)
    const productSales = await Orders.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.productName" },
          sku: { $first: "$items.sku" },
          unitsSold: { $sum: "$items.quantity" },
          revenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
          cost: { $sum: { $multiply: ["$items.cost", "$items.quantity"] } },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    const totalRevenue = productSales.reduce((sum, p) => sum + (p.revenue || 0), 0);
    const totalCost = productSales.reduce((sum, p) => sum + (p.cost || 0), 0);
    const totalProfit = totalRevenue - totalCost;

    const topProducts = productSales.slice(0, 5).map((p) => ({
      productId: p._id,
      name: p.name,
      sku: p.sku,
      unitsSold: p.unitsSold,
      revenue: p.revenue,
    }));

    // fold sold products into category totals (look up current category
    // for each sold product rather than trusting a category snapshot,
    // since order items don't store category)
    const soldProductIds = productSales.map((p) => p._id).filter(Boolean);
    const soldProducts = await Products.find({ _id: { $in: soldProductIds } })
      .select("category")
      .lean();
    const categoryByProductId = new Map(
      soldProducts.map((p) => [String(p._id), p.category]),
    );

    const categoryTotals = new Map();
    for (const p of productSales) {
      const category = categoryByProductId.get(String(p._id)) || "Uncategorized";
      const existing = categoryTotals.get(category) || {
        unitsSold: 0,
        revenue: 0,
      };
      existing.unitsSold += p.unitsSold;
      existing.revenue += p.revenue;
      categoryTotals.set(category, existing);
    }
    const categoryPerformance = Array.from(categoryTotals.entries())
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.revenue - a.revenue);

    const inventoryAgg = await Products.aggregate([
      {
        $group: {
          _id: "$category",
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalValue: { $sum: { $multiply: ["$price", "$quantity"] } },
        },
      },
      { $sort: { totalValue: -1 } },
    ]);
    const inventoryByCategory = inventoryAgg.map((c) => ({
      category: c._id || "Uncategorized",
      totalProducts: c.totalProducts,
      totalQuantity: c.totalQuantity,
      totalValue: c.totalValue,
    }));

    const customerAgg = await Orders.aggregate([
      {
        $group: {
          _id: { name: "$customerName", email: "$customerEmail" },
          orders: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount" },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
    ]);
    const topCustomers = customerAgg.map((c) => ({
      customerName: c._id.name || "Unknown customer",
      customerEmail: c._id.email || "",
      orders: c.orders,
      totalSpent: c.totalSpent,
    }));

    const distinctCustomers = await Orders.distinct("customerEmail");
    const totalCustomers = distinctCustomers.filter(Boolean).length;

    res.status(200).json({
      success: true,
      orderStatusBreakdown,
      paymentStatusBreakdown,
      profitSummary: {
        totalRevenue,
        totalCost,
        totalProfit,
        marginPercent: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      },
      topProducts,
      categoryPerformance,
      inventoryByCategory,
      topCustomers,
      totalCustomers,
    });
  } catch (error) {
    next(error);
  }
};

// forecast tuning — kept as named constants since they're referenced twice
// (the math below and the `lookbackDays`/`targetCoverDays` in the response)
const FORECAST_LOOKBACK_DAYS = 30; // sales velocity window
const FORECAST_TARGET_COVER_DAYS = 30; // days of stock a reorder should cover
const FORECAST_URGENT_THRESHOLD_DAYS = 14; // flag as urgent inside this window
// safety-stock target for items with no recent sales history — one unit
// above the "low-stock" ceiling from getStockStatus (server/CLAUDE.md)
const FORECAST_SAFETY_STOCK_QTY = 11;

// GET RESTOCK FORECAST — real demand-forecasting math, not a canned list:
// derives each product's average daily units sold from actual order history
// over the last 30 days, projects days-until-stockout against current
// quantity, and recommends a reorder quantity to cover the next 30 days.
// Products with no recent sales but critically low/out-of-stock status still
// surface with a smaller safety-stock top-up recommendation.
const getRestockForecast = async (req, res, next) => {
  try {
    const cutoff = new Date(
      Date.now() - FORECAST_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );

    const salesVelocity = await Orders.aggregate([
      { $match: { createdAt: { $gte: cutoff } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          unitsSold: { $sum: "$items.quantity" },
        },
      },
    ]);
    const velocityByProductId = new Map(
      salesVelocity.map((v) => [
        String(v._id),
        v.unitsSold / FORECAST_LOOKBACK_DAYS,
      ]),
    );

    const products = await Products.find()
      .select("name sku quantity price cost status category")
      .lean();

    const forecast = products
      .map((p) => {
        const velocity = velocityByProductId.get(String(p._id)) || 0;
        const daysUntilStockout = velocity > 0 ? p.quantity / velocity : null;
        const recommendedReorderQty =
          velocity > 0
            ? Math.max(
                Math.ceil(velocity * FORECAST_TARGET_COVER_DAYS) - p.quantity,
                0,
              )
            : p.status !== "in-stock"
              ? Math.max(FORECAST_SAFETY_STOCK_QTY - p.quantity, 0)
              : 0;
        const urgent =
          (daysUntilStockout !== null &&
            daysUntilStockout <= FORECAST_URGENT_THRESHOLD_DAYS) ||
          p.status === "out-of-stock";

        return {
          productId: p._id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          currentQuantity: p.quantity,
          status: p.status,
          avgDailyUnitsSold: Number(velocity.toFixed(2)),
          daysUntilStockout:
            daysUntilStockout !== null ? Math.round(daysUntilStockout) : null,
          recommendedReorderQty: Math.round(recommendedReorderQty),
          estimatedCost:
            Math.round(recommendedReorderQty * (p.cost || 0) * 100) / 100,
          urgent,
        };
      })
      .filter((f) => f.recommendedReorderQty > 0)
      .sort((a, b) => {
        if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
        const aDays = a.daysUntilStockout ?? Infinity;
        const bDays = b.daysUntilStockout ?? Infinity;
        return aDays - bDays;
      });

    res.status(200).json({
      success: true,
      lookbackDays: FORECAST_LOOKBACK_DAYS,
      targetCoverDays: FORECAST_TARGET_COVER_DAYS,
      summary: {
        productsToReorder: forecast.length,
        urgentCount: forecast.filter((f) => f.urgent).length,
        totalUnitsToReorder: forecast.reduce(
          (sum, f) => sum + f.recommendedReorderQty,
          0,
        ),
        totalEstimatedCost: forecast.reduce(
          (sum, f) => sum + f.estimatedCost,
          0,
        ),
      },
      items: forecast.slice(0, 8),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalyticsOverview,
  getRestockForecast,
};
