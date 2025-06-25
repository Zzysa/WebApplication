const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { PrismaClient } = require("./prisma/generated/prisma");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

const testDatabaseConnection = async () => {
  try {
    await prisma.$connect();
    console.log("[Account Service] Database connected successfully");
    const userCount = await prisma.user.count();
    console.log(`[Account Service] Users in database: ${userCount}`);
  } catch (error) {
    console.error("[Account Service] Database connection failed:", error.message);
    process.exit(1);
  }
};

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "account-service" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ message: "Something went wrong!" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

testDatabaseConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`[Account Service] Server running on port ${PORT}`);
  });
});

process.on('SIGTERM', async () => {
  console.log('[Account Service] SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});