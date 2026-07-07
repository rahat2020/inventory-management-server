const Customer = require("../models/Customer");

// GET ALL CUSTOMERS
const getAllCustomers = async (req, res, next) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const query = status ? { status } : {};
    const customers = await Customer.find(query)
      .select("name email phone totalOrders totalSpent status createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Customer.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      customers,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// GET CUSTOMER BY ID
const getCustomerById = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json(customer);
  } catch (error) {
    next(error);
  }
};

// GET CUSTOMER STATISTICS
const getCustomerStats = async (req, res, next) => {
  try {
    const totalCustomers = await Customer.countDocuments({ status: "active" });
    const inactiveCustomers = await Customer.countDocuments({
      status: "inactive",
    });

    const stats = await Customer.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalSpent" },
          averageSpent: { $avg: "$totalSpent" },
          averageOrders: { $avg: "$totalOrders" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      totalCustomers,
      inactiveCustomers,
      totalRevenue: stats[0]?.totalRevenue || 0,
      averageSpent: stats[0]?.averageSpent || 0,
      averageOrders: stats[0]?.averageOrders || 0,
    });
  } catch (error) {
    next(error);
  }
};

// CREATE CUSTOMER
const createCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, companyName, address } = req.body;

    const customer = new Customer({
      name,
      email,
      phone,
      companyName,
      address,
      status: "active",
    });

    const savedCustomer = await customer.save();
    res.status(201).json({ success: true, customer: savedCustomer });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  getCustomerStats,
  createCustomer,
};
