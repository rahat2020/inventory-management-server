const router = require("express").Router();
const {
  addCategory,
  getAllCategories,
  deleteCategory,
  categoryById,
  updateCategory,
  filterByCategory,
  filterByCategoryVideos,
  getFilterCategories,
} = require("../controllers/category");
// ADD CATEGORY
router.post("/add-category", addCategory);
// GET ALL CATEGORY
router.get("/all-categories", getAllCategories);
router.get("/filter-categories", getFilterCategories);
// GET CATEGORY BY ID
router.get("/categories/:id", categoryById);
// GET POSTS BY CATEGORY
router.get("/filter", filterByCategory);
// GET VIDEOS BY CATEGORY
router.get("/filter-products", filterByCategoryVideos);
// GET CATEGORY BY ID
router.get("/update/:id", updateCategory);
// DELETE CATEGORY
router.delete("/category/delete/:id", deleteCategory);

module.exports = router;
