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

app.use((req, res, next) => {
	res.set({
		'Cache-Control': 'no-cache, no-store, must-revalidate',
		'Pragma': 'no-cache',
		'Expires': '0'
	});
	next();
});

app.use(express.json());

app.post("/api/auth/sync", verifyAuthToken, async (req, res, next) => {
	const { uid, email } = req.firebaseUser;
	try {
		let user = await prisma.user.findUnique({
			where: { firebaseUid: uid },
		});

		if (!user) {
			const userByEmail = await prisma.user.findUnique({
				where: { email: email },
			});

			if (userByEmail) {
				user = await prisma.user.update({
					where: { email: email },
					data: { firebaseUid: uid },
				});
				console.log(`[SYNC] Linked existing user ${email} to new Firebase UID ${uid}`);
			} else {
				user = await prisma.user.create({
					data: { firebaseUid: uid, email: email, role: "client" },
				});
				console.log(`[SYNC] Created new user ${email}`);
			}
		}

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
		body("totalPrice")
			.isFloat({ gt: 0 })
			.withMessage("Total price must be greater than 0"),
		body("paymentMethod") 
			.isIn(["card", "bank_transfer", "paypal"])
			.withMessage("Invalid payment method selected"),
	],
	async (req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ 
				message: "Validation failed", 
				errors: errors.array() 
			});
		}

		const { products, totalPrice, paymentMethod } = req.body; 
		const userId = req.user.id;

		try {
			const order = await prisma.order.create({
				data: {
					userId: userId,
					products: products,
					totalPrice: totalPrice,
					paymentMethod: paymentMethod, 
					status: "pending_payment",    
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

app.post("/api/payments/process", 
	verifyAuthToken, 
	addUserToRequest,
	[
		body("orderId").isString().withMessage("Order ID is required"),
		body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
		body("method").isIn(["card", "bank_transfer", "paypal"]).withMessage("Invalid payment method"),
	],
	async (req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ 
				message: "Validation failed", 
				errors: errors.array() 
			});
		}

		const { orderId, amount, method } = req.body;
		const userId = req.user.id;

		try {
			const order = await prisma.order.findFirst({
				where: { id: orderId, userId: userId }
			});

			if (!order) {
				return res.status(404).json({ message: "Order not found" });
			}

			const mockTransactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const mockGatewayResponse = {
				gateway: "mock_payment_gateway",
				status: "success",
				fee: amount * 0.029,
				currency: "USD"
			};

			const payment = await prisma.payment.create({
				data: {
					orderId: orderId,
					amount: amount,
					method: method,
					status: "completed",
					transactionId: mockTransactionId,
					gatewayResponse: mockGatewayResponse
				}
			});

			await prisma.order.update({
				where: { id: orderId },
				data: { 
					paymentStatus: "completed",
					transactionId: mockTransactionId,
					status: "processing"
				}
			});

			res.status(201).json(payment);
		} catch (error) {
			next(error);
		}
	}
);

app.get("/api/payments/order/:orderId", verifyAuthToken, addUserToRequest, async (req, res, next) => {
	const { orderId } = req.params;
	const userId = req.user.id;
	const isAdmin = req.user.role === "admin";

	try {
		const where = isAdmin 
			? { orderId } 
			: { 
				orderId, 
				order: { userId } 
			};

		const payments = await prisma.payment.findMany({ 
			where,
			orderBy: { createdAt: 'desc' }
		});
		
		res.status(200).json(payments);
	} catch (error) {
		next(error);
	}
});

app.post("/api/payments/refund/:paymentId",
	verifyAuthToken,
	addUserToRequest,
	checkRole("admin"),
	async (req, res, next) => {
		const { paymentId } = req.params;

		try {
			const payment = await prisma.payment.findUnique({
				where: { id: paymentId }
			});

			if (!payment) {
				return res.status(404).json({ message: "Payment not found" });
			}

			const refundTransactionId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			await prisma.payment.update({
				where: { id: paymentId },
				data: { 
					status: "refunded",
					gatewayResponse: {
						...payment.gatewayResponse,
						refund: {
							id: refundTransactionId,
							amount: payment.amount,
							date: new Date().toISOString()
						}
					}
				}
			});

			res.status(200).json({ 
				message: "Refund processed successfully",
				refundId: refundTransactionId 
			});
		} catch (error) {
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