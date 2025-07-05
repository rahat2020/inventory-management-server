const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";

  // Duplicate Key Error (e.g., SKU)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for '${field}': '${err.keyValue[field]}'. Please use a unique ${field}.`;
    statusCode = 400;
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(", ");
    statusCode = 400;
  }

  // Mongoose Cast Error (e.g., invalid ObjectId)
  if (err.name === "CastError") {
    message = `Invalid value for ${err.path}: '${err.value}'`;
    statusCode = 400;
  }

  return res.status(statusCode).json({
    success: false,
    error: message,
  });
};

module.exports = errorHandler;
