const express = require("express");
const router = express.Router();
const {
  getAllSuppliers,
  getSupplierById,
  getSupplierStats,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/suppliers");

// GET all suppliers
router.get("/suppliers/all", getAllSuppliers);

// GET supplier stats
router.get("/suppliers/stats/summary", getSupplierStats);

// GET supplier by ID
router.get("/suppliers/:supplierId", getSupplierById);

// CREATE new supplier
router.post("/suppliers/create", createSupplier);

// UPDATE supplier
router.put("/suppliers/update/:supplierId", updateSupplier);

// DELETE supplier
router.delete("/suppliers/delete/:supplierId", deleteSupplier);

module.exports = router;
