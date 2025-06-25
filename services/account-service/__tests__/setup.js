const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const express = require("express");

process.env.NODE_ENV = 'test';

const { PrismaClient } = require("../prisma/generated/test-client");

const DB_PATH = path.join(__dirname, "../prisma/test.db");
const DB_URL = `file:${DB_PATH}`;

process.env.DATABASE_URL = DB_URL;

const prisma = new PrismaClient();

let mockFirebaseAuth;

jest.mock("../config/firebase-admin.js", () => {
  mockFirebaseAuth = jest.fn().mockResolvedValue({
    uid: 'test-uid-123',
    email: 'test@test.com'
  });
  
  return {
    auth: () => ({
      verifyIdToken: mockFirebaseAuth
    }),
    isInitialized: () => false
  };
});

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  const authRoutes = require("../routes/authRoutes");
  const userRoutes = require("../routes/userRoutes");
  const cartRoutes = require("../routes/cartRoutes");
  const orderRoutes = require("../routes/orderRoutes");
  const paymentRoutes = require("../routes/paymentRoutes");
  const adminRoutes = require("../routes/adminRoutes");
  
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/admin", adminRoutes);
  
  return app;
};

const setMockUser = (uid, email) => {
  mockFirebaseAuth.mockResolvedValue({ uid, email });
};

const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === "string" && (
    args[0].includes("prisma/generated") ||
    args[0].includes("Development mode") ||
    args[0].includes("Could not decode token")
  )) return;
  originalError(...args);
};

beforeAll(async () => {
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
  execSync(
    "npx prisma db push --force-reset --schema=./prisma/schema.test.prisma",
    {
      env: {
        ...process.env,
        DATABASE_URL: DB_URL,
      },
      stdio: "pipe",
    },
  );
});

beforeEach(async () => {
  setMockUser('test-uid-123', 'test@test.com');
  
  await prisma.cartItem.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.user.deleteMany({});
});

afterAll(async () => {
  await prisma.$disconnect();
  console.error = originalError;
});

module.exports = {
  createTestApp,
  prisma,
  setMockUser
};