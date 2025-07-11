const User = require("../models/User");
const Videos = require("../models/Videos");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Products = require("../models/Products");
const AppError = require("../utils/AppError");

// CREATE NEW USER OR USER REGISTRATIONS
const register = async (req, res, next) => {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(req.body.password, salt);

  try {
    if (!req.body.username || !req.body.email || !req.body.password) {
      return next(new AppError("All fields are required", 400));
    }

    const user = await new User({
      username: req.body.username,
      email: req.body.email,
      password: hash,
      role: req.body.role,
      isAdmin: req.body.isAdmin,
    });

    const saved = await user.save();
    saved &&
      res.status(200).json({
        success: true,
        message: "Registration is successfull!",
      });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
      // Duplicate key error for the 'email' field
      res.status(400).json({
        message: "Email address already in use!",
      });
    } else {
      next(
        new AppError(
          err.message || "Failed to registration!",
          err.status || 500
        )
      );
    }
  }
};

// USER LOGIN AUTHENTICATIONS
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    // Check identifier has email or username and password are provided
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Username/email and password are required",
      });
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or wrong credentials!",
      });
    }

    // Validate password
    const isValidated = await bcrypt.compare(password, user.password);
    if (!isValidated) {
      return res.status(401).json({
        success: false,
        message: "Wrong password!",
      });
    }

    // Set user as active
    user.activeUser = "yes";
    await user.save();

    const access_token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT,
      { expiresIn: "1h" }
    );

    const { password: _, isAdmin, ...userData } = user._doc;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: userData,
      access_token,
    });
  } catch (err) {
    next(new AppError(err.message || "Failed to login!", err.status || 500));
  }
};

// GET LOGGED IN USER DATA
const getUserData = async (req, res, next) => {
  const email = req.query.email;
  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required!",
      });
    }

    const isValidUser = await User.find({ email: email });
    if (!isValidUser) {
      return res.status(400).json({
        success: false,
        message: "User not found!",
      });
    }

    const getPostData = await Products.find({ "user.email": email });
    res.status(200).json({ getPostData });
    // console.log(getData)
  } catch (err) {
    next(
      new AppError(err.message || "Failed to registration!", err.status || 500)
    );
  }
};

// UPDATE USER
const updateUser = async (req, res, next) => {
  if (req.body.userId === req.params.id) {
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }

    try {
      const update = await User.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
      );
      update &&
        res.status(200).json({
          success: true,
          message: "Profile updated",
        });
      // console.log(update)
    } catch (err) {
      next(new AppError(err.message || "Failed to update!", err.status || 500));
    }
  } else {
    res.status(401).json({
      success: false,
      message: "You can update only your account!",
    });
  }
};

// FORGET PASS
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return next(new AppError("No account with that email", 404));
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const emailHtml = `
      <h2>Password Reset Request</h2>
      <p>Hello ${user.username},</p>
      <p>You requested a password reset. Click the button below to reset your password:</p>
      <a href="${resetUrl}" style="padding:10px 20px;background:#3498db;color:#fff;text-decoration:none;border-radius:5px">Reset Password</a>
      <p>If you didn't request this, you can ignore this email.</p>
    `;

    await sendEmail(user.email, "Password Reset Request", emailHtml);

    res.status(200).json({
      success: true,
      message: "Password reset email sent!",
    });
  } catch (err) {
    next(err);
  }
};

// GET ALL USERS (ADMIN ONLY)
const allUsers = async (res, next) => {
  try {
    // newest users first
    const users = await User.find({}, "-password -__v").sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    next(
      new AppError(err.message || "Failed to get all users!", err.status || 500)
    );
  }
};

// FIND USER THROUGH EMAIL
const userByEmail = async (req, res, next) => {
  try {
    const email = req.query.email;
    // Find the user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(new AppError(err.message || "Failed to update!", err.status || 500));
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// GET USER BY ID
const getUsersById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    next(new AppError(err.message || "Failed to update!", err.status || 500));
  }
};

// DELETE USERS
const deleteUsers = async (req, res, next) => {
  try {
    const isUserExist = await User.findById(req.params.id);
    if (!isUserExist) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    user &&
      res.status(200).json({
        success: true,
        message: "User deleted!",
      });
  } catch (err) {
    next(new AppError(err.message || "Failed to delete!", err.status || 500));
  }
};

module.exports = {
  allUsers,
  getUsersById,
  register,
  login,
  updateUser,
  deleteUsers,
  getUserData,
  userByEmail,
  forgotPassword,
};
