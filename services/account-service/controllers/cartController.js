const { validationResult } = require("express-validator");

let prisma;
if (process.env.NODE_ENV === 'test') {
  const { PrismaClient } = require("../prisma/generated/test-client");
  prisma = new PrismaClient();
} else {
  const { PrismaClient } = require("../prisma/generated/prisma");
  prisma = new PrismaClient();
}

const getCart = async (req, res) => {
  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    res.json(cartItems);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const addToCart = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { productId, productName, price, quantity = 1, imageUrl } = req.body;

  try {
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId: productId,
        },
      },
    });

    if (existingItem) {
      const updatedItem = await prisma.cartItem.update({
        where: {
          userId_productId: {
            userId: req.user.id,
            productId: productId,
          },
        },
        data: {
          quantity: existingItem.quantity + quantity,
          price: price,
          productName: productName,
          imageUrl: imageUrl,
        },
      });
      res.json(updatedItem);
    } else {
      const newItem = await prisma.cartItem.create({
        data: {
          userId: req.user.id,
          productId: productId,
          productName: productName,
          price: price,
          quantity: quantity,
          imageUrl: imageUrl,
        },
      });
      res.status(201).json(newItem);
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const updateCartItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { itemId } = req.params;
  const { quantity } = req.body;

  try {
    const updatedItem = await prisma.cartItem.update({
      where: {
        id: itemId,
        userId: req.user.id,
      },
      data: { quantity: quantity },
    });
    res.json(updatedItem);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Cart item not found" });
    }
    console.error("Error updating cart item:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const removeFromCart = async (req, res) => {
  const { itemId } = req.params;

  try {
    await prisma.cartItem.delete({
      where: {
        id: itemId,
        userId: req.user.id,
      },
    });
    res.json({ message: "Item removed from cart" });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Cart item not found" });
    }
    console.error("Error removing from cart:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const clearCart = async (req, res) => {
  try {
    await prisma.cartItem.deleteMany({
      where: { userId: req.user.id },
    });
    res.json({ message: "Cart cleared successfully" });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};