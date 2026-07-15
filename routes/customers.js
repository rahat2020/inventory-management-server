const express = require("express");
const router = express.Router();
const {
  getAllCustomers,
  getCustomerById,
  getCustomerStats,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customers");

// GET all customers
router.get("/customers/all", getAllCustomers);

// GET customer stats
router.get("/customers/stats/summary", getCustomerStats);

// GET customer by ID
router.get("/customers/:customerId", getCustomerById);

// CREATE new customer
router.post("/customers/create", createCustomer);

// UPDATE customer
router.put("/customers/update/:customerId", updateCustomer);

// DELETE customer
router.delete("/customers/delete/:customerId", deleteCustomer);

module.exports = router;
