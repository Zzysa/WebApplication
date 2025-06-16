const express = require("express");
const { PrismaClient } = require("./prisma/generated/prisma");
const helmet = require("helmet");
const admin = require("./config/firebase-admin.js");

const verifyAuthToken = require("./middleware/auth-middleware.js");
const addUserToRequest = require("./middleware/addUserToRequest.js");
const checkRole = require("./middleware/checkRole.js");

const app = express();
app.use(helmet());
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.post("/api/auth/sync", verifyAuthToken, async (req, res, next) => {
	const { uid, email } = req.firebaseUser;
	try {
		const user = await prisma.user.upsert({
			where: { firebaseUid: uid },
			update: { email },
			create: { firebaseUid: uid, email, role: "client" }, 
		});

		await admin.auth().setCustomUserClaims(uid, { role: user.role });

		console.log(`[Account Service] Synced user: ${email}, role: ${user.role}`);
		res.status(200).json({ message: "User synced successfully" });
	} catch (error) { 
		console.error("[Account Service] Sync error:", error);
		res.status(500).json({ message: "Could not sync user" });
	}
});

app.get(
  "/api/users/me",
  verifyAuthToken, 
  addUserToRequest, 
  (req, res) => {
    res.status(200).json(req.user);
  },
);

app.get(
  "/api/users",
  verifyAuthToken, 
  addUserToRequest, 
  checkRole("admin"), 
  async (req, res) => {
    try {
      const users = await prisma.user.findMany();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  },
);

app.listen(PORT, () => {
  console.log(`[Account Service] Running on port ${PORT}`);
});