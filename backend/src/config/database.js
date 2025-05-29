const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 5, // Reduced for free tier
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // Disable mongoose buffering
      retryWrites: true,
      w: 'majority',
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000, // Check connection health
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
    });

    // Handle connection drops for free tier
    mongoose.connection.on('close', () => {
      console.log('🔌 MongoDB connection closed');
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      try {
        await mongoose.connection.close();
        console.log("📴 MongoDB connection closed through app termination");
        process.exit(0);
      } catch (err) {
        console.error("❌ Error during MongoDB disconnection:", err);
        process.exit(1);
      }
    });

    // Handle process termination
    process.on("SIGTERM", async () => {
      try {
        await mongoose.connection.close();
        console.log("📴 MongoDB connection closed through SIGTERM");
        process.exit(0);
      } catch (err) {
        console.error("❌ Error during MongoDB disconnection:", err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error("❌ Database connection failed:", error.message);

    // Retry connection after delay for free tier cold starts
    setTimeout(() => {
      console.log("🔄 Retrying database connection...");
      connectDB();
    }, 5000);
  }
};

module.exports = connectDB;
