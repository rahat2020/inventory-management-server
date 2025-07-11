const mongoose = require("mongoose");

// Reusable message schema
const MessageSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true },
    photo: { type: String },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: { type: String },
    desc: { type: String },
    uniCode: { type: String },
  },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    photo: {
      type: String,
      default:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnMRBVny69Hii_1IH-jpKOya1QhHlCMVxc-UV-gPM&s",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    terms: {
      type: Boolean,
      default: false,
    },
    date_of_birth: {
      type: Date,
    },
    address: {
      type: String,
      trim: true,
    },
    messages: [MessageSchema],
    sentMessages: [MessageSchema],
    activeUser: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
