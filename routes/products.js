const router = require("express").Router();
const {
  createProducts,
  updateProduct,
  deleteProduct,
  getProductByID,
  getAllProducts,
} = require("../controllers/ProductsCon");

// products routes
router.post("/add-product", createProducts);
router.get("/all-products", getAllProducts);
router.get("/products/:id", getProductByID);
router.post("/add-product", createProducts);
router.put("/product/update/:id", updateProduct);
router.delete("/product/delete/:id", deleteProduct);

module.exports = router;
