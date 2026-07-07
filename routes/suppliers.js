const express = require("express");
const router = express.Router();
const {
  getAllSuppliers,
  getSupplierById,
  getSupplierStats,
  createSupplier,
} = require("../controllers/suppliers");

// GET all suppliers
router.get("/suppliers/all", getAllSuppliers);

// GET supplier stats
router.get("/suppliers/stats/summary", getSupplierStats);

// GET supplier by ID
router.get("/suppliers/:supplierId", getSupplierById);

// CREATE new supplier
router.post("/suppliers/create", createSupplier);

module.exports = router;
