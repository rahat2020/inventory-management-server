const Supplier = require("../models/Supplier");

// GET ALL SUPPLIERS
const getAllSuppliers = async (req, res, next) => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    const suppliers = await Supplier.find(query)
      .select("name email phone contactPerson totalOrders totalPurchased rating status createdAt")
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

// UPDATE SUPPLIER
const updateSupplier = async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    const {
      name,
      email,
      phone,
      contactPerson,
      address,
      paymentTerms,
      rating,
      status,
      notes,
    } = req.body;

    const updatedSupplier = await Supplier.findByIdAndUpdate(
      supplierId,
      {
        $set: {
          name,
          email,
          phone,
          contactPerson,
          address,
          paymentTerms,
          rating,
          status,
          notes,
        },
      },
      { new: true, runValidators: true },
    );

    if (!updatedSupplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }

    res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      supplier: updatedSupplier,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE SUPPLIER
const deleteSupplier = async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    const deletedSupplier = await Supplier.findByIdAndDelete(supplierId);

    if (!deletedSupplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Supplier deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  getSupplierStats,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
