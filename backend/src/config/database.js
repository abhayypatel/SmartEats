const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  // If already connected, return the existing connection
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 5, // Reduced for free tier
      serverSelectionTimeoutMS: 15000, // Increased timeout
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      retryWrites: true,
      w: 'majority',
      connectTimeoutMS: 15000,
      heartbeatFrequencyMS: 10000, // Check connection health
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    });

    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
      isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
      isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
      isConnected = true;
    });

    // Handle connection drops for free tier
    mongoose.connection.on('close', () => {
      console.log('🔌 MongoDB connection closed');
      isConnected = false;
    });

    return conn;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    isConnected = false;

    // Don't retry in serverless - let the request fail and retry on next invocation
    throw error;
  }
};

module.exports = connectDB;
