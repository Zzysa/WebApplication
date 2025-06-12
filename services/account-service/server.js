const express = require("express");
const { PrismaClient } = require("./generated/prisma");
const verifyAuthToken = require("./middleware/auth-middleware");

const app = express();
const prisma = new PrismaClient();
const PORT = 3001;

app.use(express.json());

app.post("/api/auth/sync", verifyAuthToken, async (req, res) => {
  const firebaseUid = req.user.uid;
  const email = req.user.email;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (existingUser) {
      return res.status(200).json(existingUser);
    }

    const newUser = await prisma.user.create({
      data: {
        firebaseUid: firebaseUid,
        email: email,
      },
    });

    console.log(`[Account Service] Synced new user: ${email}`);
    res.status(201).json(newUser);
  } catch (error) {
    console.error("[Account Service] Sync error:", error);
    res.status(500).json({ message: "Could not sync user" });
  }
});

app.get("/api/users/me", verifyAuthToken, async (req, res) => {
  const firebaseUid = req.user.uid;

  try {
    const user = await prisma.user.findUnique({
      where: {
        firebaseUid: firebaseUid,
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found in our database. Please sync." });
    }

    console.log(`[Account Service] Fetched data for user: ${user.email}`);
    res.status(200).json(user);
  } catch (error) {
    console.error("[Account Service] /me error:", error);
    res.status(500).json({ message: "Error fetching user data" });
  }
});

app.listen(PORT, () => {
  console.log(`[Account Service] Running on port ${PORT}`);
});