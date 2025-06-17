const express = require("express");
const { PrismaClient } = require("./prisma/generated/prisma");
const helmet = require("helmet");
const admin = require("./config/firebase-admin.js");
const verifyAuthToken = require("./middleware/auth-middleware.js");
const addUserToRequest = require("./middleware/addUserToRequest.js");
const checkRole = require("./middleware/checkRole.js");
const { body, validationResult } = require("express-validator");

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
		
		if (admin.isInitialized && admin.isInitialized()) {
			await admin.auth().setCustomUserClaims(uid, { role: user.role });
			console.log(`[SYNC] Set custom claim for UID ${uid} with role: ${user.role}`);
		} else {
			console.log(`[SYNC] Firebase not initialized, skipping custom claims for UID ${uid}`);
		}

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

app.post("/api/orders", 
	verifyAuthToken, 
	addUserToRequest,
	[
		body("products")
			.isArray({ min: 1 })
			.withMessage("Products must be a non-empty array"),
		body("products.*.productId")
			.isString()
			.withMessage("Product ID is required"),
		body("products.*.quantity")
			.isInt({ min: 1 })
			.withMessage("Quantity must be at least 1"),
		body("totalPrice")
			.isFloat({ gt: 0 })
			.withMessage("Total price must be greater than 0"),
	],
	async (req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ 
				message: "Validation failed", 
				errors: errors.array() 
			});
		}

		const { products, totalPrice } = req.body;
		const userId = req.user.id;

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
	}
);

app.get("/api/orders", verifyAuthToken, addUserToRequest, async (req, res, next) => {
	const userId = req.user.id;
	try {
		const orders = await prisma.order.findMany({
			where: { userId: userId },
			orderBy: { createdAt: 'desc' }
		});
		res.status(200).json(orders);
	} catch (error) {
		next(error);
	}
});

app.get("/api/orders/:id", verifyAuthToken, addUserToRequest, async (req, res, next) => {
	const { id } = req.params;
	const userId = req.user.id;
	const isAdmin = req.user.role === "admin";

	try {
		const where = isAdmin ? { id } : { id, userId };
		const order = await prisma.order.findFirst({ where });
		
		if (!order) {
			return res.status(404).json({ message: "Order not found" });
		}
		
		res.status(200).json(order);
	} catch (error) {
		next(error);
	}
});

app.get(
	"/api/admin/orders",
	verifyAuthToken,
	addUserToRequest,
	checkRole("admin"),
	async (req, res, next) => {
		try {
			const orders = await prisma.order.findMany({
				include: { user: { select: { email: true } } },
				orderBy: { createdAt: 'desc' }
			});
			res.status(200).json(orders);
		} catch (error) {
			next(error);
		}
	}
);

app.patch(
	"/api/orders/:id/status",
	verifyAuthToken,
	addUserToRequest,
	checkRole("admin"),
	[
		body("status")
			.isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
			.withMessage("Invalid status value"),
	],
	async (req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ 
				message: "Validation failed", 
				errors: errors.array() 
			});
		}

		const { id } = req.params;
		const { status } = req.body;

		try {
			const order = await prisma.order.update({
				where: { id },
				data: { status }
			});
			res.status(200).json(order);
		} catch (error) {
			if (error.code === 'P2025') {
				return res.status(404).json({ message: "Order not found" });
			}
			next(error);
		}
	}
);

app.use((err, req, res, next) => {
	console.error("[Account Service Error]", err.stack);
	res.status(500).json({ message: "Something went wrong!" });
});

app.listen(PORT, () => {
	console.log(`[Account Service] Running on port ${PORT}`);
});