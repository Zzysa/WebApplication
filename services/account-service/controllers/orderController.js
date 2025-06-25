const { validationResult } = require("express-validator");

let prisma;
if (process.env.NODE_ENV === 'test') {
  const { PrismaClient } = require("../prisma/generated/test-client");
  prisma = new PrismaClient();
} else {
  const { PrismaClient } = require("../prisma/generated/prisma");
  prisma = new PrismaClient();
}

const createOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { products, totalPrice, paymentMethod } = req.body;

  try {
    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        products: JSON.stringify(products),
        totalPrice: totalPrice,
        paymentMethod: paymentMethod,
        status: "pending_payment",
      },
    });

    const responseOrder = {
      ...order,
      products: JSON.parse(order.products)
    };

    res.status(201).json(responseOrder);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    const formattedOrders = orders.map(order => ({
      ...order,
      products: JSON.parse(order.products)
    }));

    res.json(formattedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getAllOrders = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const orders = await prisma.order.findMany({
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    });

    const formattedOrders = orders.map(order => ({
      ...order,
      products: JSON.parse(order.products)
    }));

    res.json(formattedOrders);
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const updateOrderStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.update({
      where: { id },
      data: { status },
    });

    const responseOrder = {
      ...order,
      products: JSON.parse(order.products)
    };

    res.json(responseOrder);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Order not found" });
    }
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
};