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

    console.log(`[SYNC] User from DB has role: ${user.role}`);
		await admin.auth().setCustomUserClaims(uid, { role: user.role });
		console.log(`[SYNC] Set custom claim for UID ${uid} with role: ${user.role}`);

		res.status(200).json({ message: "User synced successfully" });
	} catch (error) {
		next(error);
	}
});

app.get("/api/users/me", verifyAuthToken, addUserToRequest, (req, res) => {
	res.status(200).json(req.user);
});

app.get(
	"/api/users",
	verifyAuthToken,
	addUserToRequest,
	checkRole("admin"),
	async (req, res, next) => {
		try {
			const users = await prisma.user.findMany();
			res.status(200).json(users);
		} catch (error) {
			next(error);
		}
	},
);

app.post("/api/orders", verifyAuthToken, addUserToRequest, async (req, res, next) => {
	const { products, totalPrice } = req.body;
	const userId = req.user.id;

	if (!products || !totalPrice) {
		return res.status(400).json({ message: "Missing order data" });
	}

	try {
		const order = await prisma.order.create({
			data: {
				userId: userId,
				products: products,
				totalPrice: totalPrice,
			},
		});
		res.status(201).json(order);
	} catch (error) {
		next(error);
	}
});

app.use((err, req, res, next) => {
	console.error("[Account Service Error]", err.stack);
	res.status(500).json({ message: "Something went wrong!" });
});

app.listen(PORT, () => {
	console.log(`[Account Service] Running on port ${PORT}`);
});