const Orders = require("../models/Orders");
const Products = require("../models/Products");

// GET ALL ORDERS
const getAllOrders = async (req, res, next) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const query = status ? { status } : {};
    const orders = await Orders.find(query)
      .select(
        "orderNumber customerName totalAmount status paymentStatus createdAt",
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

// GET ORDER STATISTICS
const getOrderStats = async (req, res, next) => {
  try {
    const totalOrders = await Orders.countDocuments();
    const pendingOrders = await Orders.countDocuments({ status: "pending" });
    const confirmedOrders = await Orders.countDocuments({
      status: "confirmed",
    });
    const shippedOrders = await Orders.countDocuments({ status: "shipped" });
    const deliveredOrders = await Orders.countDocuments({
      status: "delivered",
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

    res.status(200).json({
      success: true,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      totalAmount: stats[0]?.totalAmount || 0,
      averageOrderValue: stats[0]?.averageOrderValue || 0,
      averageItems: stats[0]?.averageItems || 0,
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
  createOrder,
};
