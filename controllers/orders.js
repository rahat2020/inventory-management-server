const Orders = require("../models/Orders");
const Products = require("../models/Products");

// GET ALL ORDERS
const getAllOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus, search, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerEmail: { $regex: search, $options: "i" } },
      ];
    }

    const orders = await Orders.find(query)
      .select(
        "orderNumber customerName customerEmail totalAmount totalItems status paymentStatus createdAt",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Orders.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      orders,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE ORDER STATUS (and optionally paymentStatus alongside it)
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, paymentStatus } = req.body;

    const validStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    const validPaymentStatuses = ["unpaid", "partial", "paid"];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid paymentStatus. Must be one of: ${validPaymentStatuses.join(", ")}`,
      });
    }
    if (!status && !paymentStatus) {
      return res.status(400).json({
        success: false,
        message: "status or paymentStatus is required",
      });
    }

    const update = {};
    if (status) update.status = status;
    if (paymentStatus) update.paymentStatus = paymentStatus;

    const order = await Orders.findByIdAndUpdate(
      orderId,
      { $set: update },
      { new: true, runValidators: true },
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      order,
    });
  } catch (error) {
    next(error);
  }
};

// GET ORDER BY ID
const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Orders.findById(orderId).populate("items.productId");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

// percentage change from `previous` to `current`; null when there's no
// previous-period baseline to compare against (avoids a misleading "+100%")
const getTrendPercent = (current, previous) => {
  if (!previous) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
};

// GET ORDER STATISTICS
const getOrderStats = async (req, res, next) => {
  try {
    const totalOrders = await Orders.countDocuments();
    const pendingOrders = await Orders.countDocuments({ status: "pending" });
    const confirmedOrders = await Orders.countDocuments({
      status: "confirmed",
    });
    const processingOrders = await Orders.countDocuments({
      status: "processing",
    });
    const shippedOrders = await Orders.countDocuments({ status: "shipped" });
    const deliveredOrders = await Orders.countDocuments({
      status: "delivered",
    });
    const cancelledOrders = await Orders.countDocuments({
      status: "cancelled",
    });

    const stats = await Orders.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
          averageItems: { $avg: "$totalItems" },
        },
      },
    ]);

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfThisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfLastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const ordersToday = await Orders.countDocuments({
      createdAt: { $gte: startOfToday },
    });

    const [thisWeek] = await Orders.aggregate([
      { $match: { createdAt: { $gte: startOfThisWeek } } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]);
    const [lastWeek] = await Orders.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfLastWeek, $lt: startOfThisWeek },
        },
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      ordersToday,
      totalAmount: stats[0]?.totalAmount || 0,
      averageOrderValue: stats[0]?.averageOrderValue || 0,
      averageItems: stats[0]?.averageItems || 0,
      trends: {
        ordersThisWeek: thisWeek?.orders || 0,
        ordersLastWeek: lastWeek?.orders || 0,
        ordersChangePercent: getTrendPercent(
          thisWeek?.orders || 0,
          lastWeek?.orders || 0,
        ),
        revenueThisWeek: thisWeek?.revenue || 0,
        revenueLastWeek: lastWeek?.revenue || 0,
        revenueChangePercent: getTrendPercent(
          thisWeek?.revenue || 0,
          lastWeek?.revenue || 0,
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET SALES TREND (for dashboard chart) — aggregates totalAmount by bucket
const getSalesTrend = async (req, res, next) => {
  try {
    const { period = "weekly" } = req.query;

    let startDate;
    let dateFormat;
    if (period === "yearly") {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      dateFormat = "%Y-%m";
    } else if (period === "monthly") {
      startDate = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
      dateFormat = "%Y-%m-%d";
    } else {
      startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      dateFormat = "%Y-%m-%d";
    }
    startDate.setHours(0, 0, 0, 0);

    const buckets = await Orders.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const bucketMap = new Map(buckets.map((b) => [b._id, b]));

    // fill in zero-value buckets so the chart has a continuous, evenly
    // spaced series instead of gaps on days/months with no orders
    const points = [];
    if (period === "yearly") {
      for (let i = 0; i < 12; i += 1) {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + i);
        const key = d.toISOString().slice(0, 7);
        const bucket = bucketMap.get(key);
        points.push({
          label: d.toLocaleDateString("en-US", { month: "short" }),
          revenue: bucket?.revenue || 0,
          orders: bucket?.orders || 0,
        });
      }
    } else {
      const days = period === "monthly" ? 30 : 7;
      for (let i = 0; i < days; i += 1) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        const bucket = bucketMap.get(key);
        points.push({
          label: d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          revenue: bucket?.revenue || 0,
          orders: bucket?.orders || 0,
        });
      }
    }

    const totalRevenue = points.reduce((sum, p) => sum + p.revenue, 0);

    res.status(200).json({
      success: true,
      period,
      totalRevenue,
      points,
    });
  } catch (error) {
    next(error);
  }
};

// CREATE ORDER
const createOrder = async (req, res, next) => {
  try {
    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      items,
      totalAmount,
      shippingAddress,
      billingAddress,
    } = req.body;

    // Generate unique order number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const orderNumber = `ORD-${timestamp}-${random}`;

    const order = new Orders({
      orderNumber,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      items,
      totalItems: items.length,
      totalAmount,
      shippingAddress,
      billingAddress,
      status: "pending",
    });

    const savedOrder = await order.save();
    res.status(201).json({ success: true, order: savedOrder });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  getOrderStats,
  getSalesTrend,
  createOrder,
  updateOrderStatus,
};
