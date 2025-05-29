const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error("Error:", err);

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = {
      message,
      statusCode: 404,
    };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    let message = "Duplicate field value entered";

    // Extract field name from error
    const field = Object.keys(err.keyValue)[0];
    if (field === "email") {
      message = "Email address is already registered";
    } else if (field === "barcode") {
      message = "Product with this barcode already exists";
    }

    error = {
      message,
      statusCode: 400,
    };
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = {
      message,
      statusCode: 400,
    };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = {
      message,
      statusCode: 401,
    };
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = {
      message,
      statusCode: 401,
    };
  }

  // Multer errors (file upload)
  if (err.code === "LIMIT_FILE_SIZE") {
    const message = "File too large";
    error = {
      message,
      statusCode: 400,
    };
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    const message = "Too many files";
    error = {
      message,
      statusCode: 400,
    };
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    const message = "Unexpected file field";
    error = {
      message,
      statusCode: 400,
    };
  }

  // OpenAI API errors
  if (err.type === "invalid_request_error") {
    const message = "Invalid request to AI service";
    error = {
      message,
      statusCode: 400,
    };
  }

  if (err.type === "rate_limit_error") {
    const message = "AI service rate limit exceeded. Please try again later.";
    error = {
      message,
      statusCode: 429,
    };
  }

  // Cloudinary errors
  if (err.name === "CloudinaryError") {
    const message = "Image upload failed";
    error = {
      message,
      statusCode: 400,
    };
  }

  // Default error response
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      error: err,
    }),
  });
};

module.exports = errorHandler;
