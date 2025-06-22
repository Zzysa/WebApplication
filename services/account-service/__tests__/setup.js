const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

jest.mock("../prisma/generated/prisma", () => ({
  PrismaClient: jest.requireActual("../prisma/generated/test-client")
    .PrismaClient,
}));

const { PrismaClient } = require("../prisma/generated/test-client");

const DB_PATH = path.join(__dirname, "../prisma/test.db");
const DB_URL = `file:${DB_PATH}`;

process.env.DATABASE_URL = DB_URL;

const prisma = new PrismaClient();

jest.mock("../middleware/auth-middleware", () =>
  jest.fn((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }
    req.firebaseUser = { uid: "test-uid-123", email: "test@test.com" };
    next();
  }),
);

const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === "string" && args[0].includes("prisma/generated"))
    return;
  originalError(...args);
};

beforeAll(() => {
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
  await prisma.cartItem.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.user.deleteMany({});
});

afterAll(async () => {
  await prisma.$disconnect();
  console.error = originalError;
});