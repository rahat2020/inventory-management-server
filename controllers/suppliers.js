const Supplier = require("../models/Supplier");

// GET ALL SUPPLIERS
const getAllSuppliers = async (req, res, next) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const query = status ? { status } : {};
    const suppliers = await Supplier.find(query)
      .select("name email phone totalOrders rating status createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Supplier.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      suppliers,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// GET SUPPLIER BY ID
const getSupplierById = async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    const supplier =
      await Supplier.findById(supplierId).populate("products.productId");

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.status(200).json(supplier);
  } catch (error) {
    next(error);
  }
};

// GET SUPPLIER STATISTICS
const getSupplierStats = async (req, res, next) => {
  try {
    const totalSuppliers = await Supplier.countDocuments({ status: "active" });
    const inactiveSuppliers = await Supplier.countDocuments({
      status: "inactive",
    });

    const stats = await Supplier.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: null,
          totalPurchased: { $sum: "$totalPurchased" },
          averagePurchased: { $avg: "$totalPurchased" },
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      totalSuppliers,
      inactiveSuppliers,
      totalPurchased: stats[0]?.totalPurchased || 0,
      averagePurchased: stats[0]?.averagePurchased || 0,
      averageRating: stats[0]?.averageRating || 0,
    });
  } catch (error) {
    next(error);
  }
};

// CREATE SUPPLIER
const createSupplier = async (req, res, next) => {
  try {
    const { name, email, phone, contactPerson, address, paymentTerms } =
      req.body;

    const supplier = new Supplier({
      name,
      email,
      phone,
      contactPerson,
      address,
      paymentTerms,
      status: "active",
    });

    const savedSupplier = await supplier.save();
    res.status(201).json({ success: true, supplier: savedSupplier });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  getSupplierStats,
  createSupplier,
};
