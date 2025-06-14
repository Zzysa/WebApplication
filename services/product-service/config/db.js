const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[Product Service] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Product Service] MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

