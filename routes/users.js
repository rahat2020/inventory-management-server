const router = require("express").Router();

const {
  allUsers,
  getUsersById,
  register,
  login,
  updateUser,
  deleteUsers,
  getUserData,
  userByEmail,
  forgotPassword,
} = require("../controllers/users");
const { verifyUser, verifyAdmin } = require("../utils/Verifytoken");

// CREATE NEW USER
router.post("/register", register);
// LOGIN USER
router.post("/login", login);
// UPDATE USER
router.put("/update-user/:id", updateUser, verifyUser);
// FORGET PASS
router.post("/forget-password", forgotPassword);
// GET ALL USERS
router.get("/all", verifyAdmin, allUsers);
// GET USER BY ID
router.get("/user/:id", getUsersById);
// GET LOGGED IN USER DATA
router.get("/user", getUserData);
// GET USER THROUGH EMAIL
router.get("/user-data", userByEmail);
// DELETE USER
router.delete("/deleteuser/:id", deleteUsers);

module.exports = router;
